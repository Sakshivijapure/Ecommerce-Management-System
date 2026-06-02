from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from database.db import get_db_connection

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

router = APIRouter()

# ---------------- REQUEST MODEL ----------------
class RecommendationRequest(BaseModel):
    product_ids: List[int]


# ---------------- COLLABORATIVE FILTERING ----------------
@router.post("/collaborative")
def collaborative_recommendations(data: RecommendationRequest):

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        recommendations = {}

        for product_id in data.product_ids:

            cursor.execute("""
                SELECT DISTINCT o.group_id
                FROM orders o
                JOIN order_item oi
                    ON o.order_id = oi.order_id
                WHERE oi.product_id = %s
            """, (product_id,))

            groups = cursor.fetchall()

            if not groups:
                continue

            group_ids = [g["group_id"] for g in groups]
            placeholders = ",".join(["%s"] * len(group_ids))

            cursor.execute(
                f"""
                SELECT
                    oi.product_id,
                    COUNT(*) AS score
                FROM orders o
                JOIN order_item oi
                    ON o.order_id = oi.order_id
                WHERE o.group_id IN ({placeholders})
                AND oi.product_id != %s
                GROUP BY oi.product_id
                ORDER BY score DESC
                """,
                tuple(group_ids) + (product_id,)
            )

            rows = cursor.fetchall()

            for row in rows:
                pid = row["product_id"]
                recommendations[pid] = recommendations.get(pid, 0) + row["score"]

        if not recommendations:
            return []

        sorted_products = sorted(
            recommendations.items(),
            key=lambda x: x[1],
            reverse=True
        )

        top_ids = [p[0] for p in sorted_products[:8]]
        placeholders = ",".join(["%s"] * len(top_ids))

        cursor.execute(
            f"""
            SELECT
                p.product_id,
                p.name,
                p.price,
                (
                    SELECT pi.image_url
                    FROM product_image pi
                    WHERE pi.product_id = p.product_id
                    ORDER BY pi.image_id
                    LIMIT 1
                ) AS image_url
            FROM product p
            WHERE p.product_id IN ({placeholders})
            AND p.product_status = 'ACTIVE'
            """,
            tuple(top_ids)
        )

        return cursor.fetchall()

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ---------------- CONTENT BASED FILTERING (TF-IDF) ----------------
@router.get("/content/{product_id}")
def get_content_recommendations(product_id: int):

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                p.product_id,
                p.name,
                p.description,
                p.category_id,
                p.price,
                (
                    SELECT pi.image_url
                    FROM product_image pi
                    WHERE pi.product_id = p.product_id
                    ORDER BY pi.image_id
                    LIMIT 1
                ) AS image_url
            FROM product p
            WHERE p.product_status = 'ACTIVE'
        """)

        products = cursor.fetchall()

        if not products:
            return []

        product_texts = [
            f"{p['name']} {p['description'] or ''} category_{p['category_id']}"
            for p in products
        ]

        tfidf = TfidfVectorizer(stop_words="english")
        tfidf_matrix = tfidf.fit_transform(product_texts)

        similarity_matrix = cosine_similarity(tfidf_matrix)

        target_index = next(
            (i for i, p in enumerate(products) if p["product_id"] == product_id),
            None
        )

        if target_index is None:
            raise HTTPException(status_code=404, detail="Product not found")

        scores = list(enumerate(similarity_matrix[target_index]))
        scores = sorted(scores, key=lambda x: x[1], reverse=True)

        result = []

        for idx, score in scores:
            if products[idx]["product_id"] == product_id:
                continue

            result.append({
                "product_id": products[idx]["product_id"],
                "name": products[idx]["name"],
                "price": products[idx]["price"],
                "image_url": products[idx]["image_url"],
                "score": round(float(score), 3)
            })

            if len(result) == 6:
                break

        return result

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()