import os
from importlib import import_module


SimpleConnectionPool = import_module("psycopg2.pool").SimpleConnectionPool


def load_dotenv():
    """Load variables from the adjacent .env file using only the standard library."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    try:
        with open(env_path, encoding="utf-8") as env_file:
            for line in env_file:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip("\"'"))
    except FileNotFoundError:
        pass


load_dotenv()

pool = SimpleConnectionPool(
    1,
    10,
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    database=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD")
)


def get_connection():
    return pool.getconn()


def release_connection(connection):
    pool.putconn(connection)

def test_connection():
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute("SELECT NOW();")
            result = cursor.fetchone()

        print("PostgreSQL connection successful.")
        print("Database time:", result[0])

    except Exception as error:
        print("Database connection failed:")
        print(error)

    finally:
        if connection:
            release_connection(connection)


if __name__ == "__main__":
    test_connection()