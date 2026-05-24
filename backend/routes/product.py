from fastapi import APIRouter, Query
from database.db import cursor, conn

router = APIRouter()


@router.get("/products")
def get_products(category_id: int = Query(None)):

    query = """
        SELECT
            p.product_id,
            p.name,
            p.price,
            p.stock_quantity,
            MIN(pi.image_url) AS image_url,
            ROUND(AVG(DISTINCT r.rating), 1) AS average_rating,
            COUNT(DISTINCT r.review_id) AS total_reviews
        FROM product p
        LEFT JOIN product_image pi ON p.product_id = pi.product_id
        LEFT JOIN review r ON p.product_id = r.product_id
        AND r.review_status = 'VISIBLE'
    """

    params = []

    if category_id is not None:
        query += " WHERE p.category_id = %s "
        params.append(category_id)

    query += """
        GROUP BY
            p.product_id,
            p.name,
            p.price,
            p.stock_quantity
    """

    cursor.execute(query, params)
    return cursor.fetchall()


@router.get("/products/{product_id}")
def get_product(product_id: int):

    try:
        product_query = """
            SELECT
                p.product_id,
                p.name,
                p.price,
                p.description,
                p.category_id,
                pi.image_url
            FROM product p
            LEFT JOIN product_image pi ON p.product_id = pi.product_id
            WHERE p.product_id = %s
        """

        cursor.execute(product_query, (product_id,))
        rows = cursor.fetchall()

        if not rows:
            return {"message": "Product not found"}

        images = []
        seen = set()

        for row in rows:
            img = row.get("image_url")
            if img and img not in seen:
                images.append(img)
                seen.add(img)

        review_query = """
            SELECT
                u.username AS user_name,
                r.rating,
                r.review_text AS comment,
                r.created_at
            FROM review r
            LEFT JOIN user u ON r.user_id = u.user_id
            WHERE r.product_id = %s
            AND r.review_status = 'VISIBLE'
            ORDER BY r.created_at DESC
        """

        cursor.execute(review_query, (product_id,))
        review_rows = cursor.fetchall()

        reviews = []
        ratings = []

        for r in review_rows:
            reviews.append({
                "user_name": r["user_name"],
                "rating": r["rating"],
                "comment": r["comment"],
                "created_at": str(r["created_at"])
            })

            if r["rating"]:
                ratings.append(r["rating"])

        avg_rating = sum(ratings) / len(ratings) if ratings else 0

        return {
            "product_id": rows[0]["product_id"],
            "name": rows[0]["name"],
            "price": rows[0]["price"],
            "description": rows[0]["description"],
            "category_id": rows[0]["category_id"],
            "images": images,
            "average_rating": round(avg_rating, 1),
            "total_reviews": len(reviews),
            "reviews": reviews
        }

    except Exception as e:
        return {"error": str(e)}