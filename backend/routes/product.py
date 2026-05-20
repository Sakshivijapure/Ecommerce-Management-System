from fastapi import APIRouter
from database.db import conn, cursor

router = APIRouter()

@router.get("/products")
def get_products():

    query = """
    SELECT 
        p.product_id,
        p.name,
        p.price,
        pi.image_url
    FROM product p
    LEFT JOIN product_image pi
    ON p.product_id = pi.product_id
    """

    cursor.execute(query)

    products = cursor.fetchall()

    return products