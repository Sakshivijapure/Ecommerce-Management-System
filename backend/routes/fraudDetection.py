import os
import joblib
import numpy as np
import pandas as pd
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from database.db import get_db_connection

router = APIRouter()


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "models", "fraud_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "models", "fraud_label_encoder.pkl")

model = joblib.load(MODEL_PATH)
label_encoder = joblib.load(ENCODER_PATH)

FEATURE_COLS = [
    "total_orders",
    "returned_orders",
    "return_rate",      
    "cancelled_orders",
    "avg_order_value",
    "seller_total_sales",
    "seller_returns",
    "seller_return_rate",  
    "avg_rating",
    "negative_review_percent",  
    "reviews_same_seller",
    "repeated_review_similarity" 
]

class BanRequest(BaseModel):
    type: str
    id: int


def run_model(feature_dict: dict):
    """Returns (fraud_type str, fraud_score float 0-100)."""
    df = pd.DataFrame([feature_dict], columns=FEATURE_COLS)
    prediction  = model.predict(df)[0]
    probability = float(np.max(model.predict_proba(df)[0])) * 100
    fraud_type  = label_encoder.inverse_transform([prediction])[0]
    
    if fraud_type == 'NONE':
        if feature_dict.get("seller_total_sales", 0) == 0:
            tot_orders = int(feature_dict.get("total_orders", 0) or 0)
            ret_orders = int(feature_dict.get("returned_orders", 0) or 0)
            ret_rate = float(feature_dict.get("return_rate", 0.0) or 0.0)
            avg_val = float(feature_dict.get("avg_order_value", 0.0) or 0.0)
            rss = int(feature_dict.get("reviews_same_seller", 0) or 0)
            sim = float(feature_dict.get("repeated_review_similarity", 0.0) or 0.0)
            
            if (ret_rate >= 0.25 and tot_orders >= 2) or (ret_orders >= 1 and avg_val >= 10000.0):
                score = min(98.5, (ret_rate * 60) + min(30.0, avg_val / 3000) + 15)
                return "RETURN_ABUSE", round(score, 2)
            
            if rss >= 3 or sim >= 0.4:
                score = min(98.5, (sim * 70) + (rss * 4) + 10)
                return "REPEATED_REVIEW", round(score, 2)
                
        elif feature_dict.get("total_orders", 0) == 0:
            sales = int(feature_dict.get("seller_total_sales", 0) or 0)
            returns = int(feature_dict.get("seller_returns", 0) or 0)
            ret_rate = float(feature_dict.get("seller_return_rate", 0.0) or 0.0)
            avg_rating = float(feature_dict.get("avg_rating", 0.0) or 0.0)
            neg_pct = float(feature_dict.get("negative_review_percent", 0.0) or 0.0)
            
            if ret_rate >= 0.15 or neg_pct >= 10.0 or (0.0 < avg_rating < 3.8):
                score = 15.0
                if ret_rate >= 0.15:
                    score += (ret_rate * 50)
                if neg_pct >= 10.0:
                    score += (neg_pct * 0.4)
                if 0.0 < avg_rating < 3.8:
                    score += (4.0 - avg_rating) * 15
                return "SELLER_SUSPICIOUS", round(min(98.5, score), 2)
                
    return fraud_type, round(probability, 2)


def get_customer_features():
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            u.user_id,
            u.username AS customer_name,
            u.account_status,
            COUNT(o.order_id) AS total_orders,
            SUM(CASE WHEN o.order_status IN ('RETURNED', 'RETURN_REQUESTED') THEN 1 ELSE 0 END) AS returned_orders,
            SUM(CASE WHEN o.order_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_orders,
            AVG(o.total_amount) AS avg_order_value
        FROM user u
        LEFT JOIN orders o ON u.user_id = o.user_id
        WHERE u.role = 'Customer'
        GROUP BY u.user_id, u.username, u.account_status
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    results = []
    for row in rows:
        total = row["total_orders"]    or 0
        returned = row["returned_orders"] or 0
        rate_raw = (returned / total) if total > 0 else 0.0 

        results.append({
            "customer_id": row["user_id"],
            "customer_name": row["customer_name"],
            "account_status": row["account_status"],
            "total_orders": total,
            "returned_orders": returned,
            "return_rate_raw": rate_raw,               
            "return_rate": round(rate_raw * 100, 2),      
            "cancelled_orders": row["cancelled_orders"] or 0,
            "avg_order_value": float(row["avg_order_value"] or 0),
        })
    return results


def get_seller_features():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            s.seller_id,
            s.shop_name,
            u.account_status,
            COUNT(oi.order_item_id) AS seller_total_sales,
            SUM(CASE WHEN o.order_status IN ('RETURNED', 'RETURN_REQUESTED') THEN 1 ELSE 0 END) AS seller_returns,
            AVG(p.avg_rating) AS avg_rating
        FROM seller s
        JOIN user u ON s.user_id = u.user_id
        LEFT JOIN product p ON s.seller_id = p.seller_id
        LEFT JOIN order_item oi ON oi.product_id = p.product_id
        LEFT JOIN orders o ON oi.order_id = o.order_id
        GROUP BY s.seller_id, s.shop_name, u.account_status
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    results = []
    for row in rows:
        sales = row["seller_total_sales"] or 0
        returns = row["seller_returns"]     or 0
        rate_raw = (returns / sales) if sales > 0 else 0.0 

        results.append({
            "seller_id": row["seller_id"],
            "seller_name": row["shop_name"],
            "account_status": row["account_status"],
            "seller_total_sales": sales,
            "seller_returns": returns,
            "seller_return_rate_raw": rate_raw,                 
            "seller_return_rate": round(rate_raw * 100, 2), 
            "avg_rating": float(row["avg_rating"] or 0),
        })
    return results


def get_negative_review_percent(seller_id: int) -> float:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            COUNT(*) AS total_reviews,
            SUM(CASE WHEN r.sentiment_label = 'NEGATIVE' THEN 1 ELSE 0 END) AS negative_reviews
        FROM review r
        JOIN product p ON r.product_id = p.product_id
        WHERE p.seller_id = %s
    """, (seller_id,))

    row = cursor.fetchone()
    cursor.close()
    conn.close()

    total = row["total_reviews"] or 0
    negative = row["negative_reviews"] or 0
    if total == 0:
        return 0.0
    return round((negative / total) * 100, 2)



def get_review_features(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT COALESCE(MAX(cnt), 0) AS reviews_same_seller
        FROM (
            SELECT COUNT(*) AS cnt
            FROM review r
            JOIN product p ON r.product_id = p.product_id
            WHERE r.user_id = %s
            GROUP BY p.seller_id
        ) sub
    """, (user_id,))
    rss_row = cursor.fetchone()
    reviews_same_seller = int(rss_row["reviews_same_seller"] or 0)

    cursor.execute(
        "SELECT review_text FROM review WHERE user_id = %s",
        (user_id,)
    )
    reviews = cursor.fetchall()
    cursor.close()
    conn.close()

    texts = [r["review_text"].strip().lower() for r in reviews if r["review_text"]]

    if len(texts) <= 1:
        return reviews_same_seller, 0.0

    duplicates = sum(1 for t in texts if texts.count(t) > 1)
    similarity_raw = duplicates / len(texts)     

    return reviews_same_seller, round(similarity_raw, 4)

@router.get("/admin-fraud-dashboard")
def fraud_dashboard():

    customers = get_customer_features()
    sellers = get_seller_features()

    return_abuse_list = []
    repeated_review_list = []
    suspicious_seller_list = []

    for c in customers:
        rss, sim = get_review_features(c["customer_id"])

        features = {
            "total_orders": c["total_orders"],
            "returned_orders": c["returned_orders"],
            "return_rate": c["return_rate_raw"],   
            "cancelled_orders": c["cancelled_orders"],
            "avg_order_value": c["avg_order_value"],
            "seller_total_sales": 0,
            "seller_returns": 0,
            "seller_return_rate": 0,
            "avg_rating": 0,
            "negative_review_percent": 0,
            "reviews_same_seller": rss,
            "repeated_review_similarity": sim,                  
        }

        fraud_type, score = run_model(features)

        c["fraud_type"] = fraud_type
        c["fraud_score"] = score
        c["reviews_same_seller"] = rss
        c["review_similarity_pct"] = round(sim * 100, 1)         

        if fraud_type == "RETURN_ABUSE":
            return_abuse_list.append(c)
        elif fraud_type == "REPEATED_REVIEW":
            repeated_review_list.append(c)

    for s in sellers:
        neg_pct = get_negative_review_percent(s["seller_id"])

        features = {
            "total_orders": 0,
            "returned_orders": 0,
            "return_rate": 0,
            "cancelled_orders": 0,
            "avg_order_value": 0,
            "seller_total_sales": s["seller_total_sales"],
            "seller_returns": s["seller_returns"],
            "seller_return_rate": s["seller_return_rate_raw"],  
            "avg_rating": s["avg_rating"],
            "negative_review_percent": neg_pct,
            "reviews_same_seller": 0,
            "repeated_review_similarity": 0,
        }

        fraud_type, score = run_model(features)

        s["fraud_type"] = fraud_type
        s["fraud_score"] = score
        s["negative_review_percent"] = neg_pct

        if fraud_type == "SELLER_SUSPICIOUS":
            suspicious_seller_list.append(s)

    return_abuse_list.sort(key=lambda x: x["fraud_score"], reverse=True)
    repeated_review_list.sort(key=lambda x: x["fraud_score"], reverse=True)
    suspicious_seller_list.sort(key=lambda x: x["fraud_score"], reverse=True)

    return {
        "success": True,
        "overview": {
            "total_customers": len(customers),
            "total_sellers": len(sellers),
            "suspicious_customers": len(return_abuse_list),
            "suspicious_sellers": len(suspicious_seller_list),
            "repeated_reviews": len(repeated_review_list),
            "high_risk": (
                len(return_abuse_list)
                + len(suspicious_seller_list)
                + len(repeated_review_list)
            ),
        },
        "customers": return_abuse_list,
        "sellers": suspicious_seller_list,
        "reviews": repeated_review_list,
    }


@router.post("/ban-user")
def ban_user(data: BanRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if data.type == "customer":
            cursor.execute(
                "UPDATE user SET account_status = 'Suspended' WHERE user_id = %s",
                (data.id,)
            )
        elif data.type == "seller":
            cursor.execute(
                """UPDATE user u
                   JOIN seller s ON u.user_id = s.user_id
                   SET u.account_status = 'Suspended'
                   WHERE s.seller_id = %s""",
                (data.id,)
            )
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.post("/unban-user")
def unban_user(data: BanRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if data.type == "customer":
            cursor.execute(
                "UPDATE user SET account_status = 'Active' WHERE user_id = %s",
                (data.id,)
            )
        elif data.type == "seller":
            cursor.execute(
                """UPDATE user u
                   JOIN seller s ON u.user_id = s.user_id
                   SET u.account_status = 'Active'
                   WHERE s.seller_id = %s""",
                (data.id,)
            )
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()