import mysql.connector
from datetime import datetime
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DBService:
    def __init__(self):
        self.config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', 'Admin@123')
        }
        self.database = os.getenv('DB_NAME', 'sign_trans_db')
        self._initialize_db()

    def _get_connection(self, include_db=True):
        config = self.config.copy()
        if include_db:
            config['database'] = self.database
        return mysql.connector.connect(**config)

    def _initialize_db(self):
        # First connect without database to create it
        conn = self._get_connection(include_db=False)
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.database}")
        conn.close()

        # Connect with database to create tables
        conn = self._get_connection(include_db=True)
        cursor = conn.cursor()
        
        # Create Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL
            )
        """)

        # Create History table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS history (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                text TEXT NOT NULL,
                translation_type VARCHAR(255) NOT NULL,
                timestamp DATETIME NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        conn.commit()
        conn.close()

    def create_user(self, name, email, password):
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if user exists
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            conn.close()
            return None, "User already exists"
        
        user_id = str(uuid.uuid4())
        created_at = datetime.now()
        
        cursor.execute(
            "INSERT INTO users (id, name, email, password, created_at) VALUES (%s, %s, %s, %s, %s)",
            (user_id, name, email, password, created_at)
        )
        
        user_data = {
            "id": user_id,
            "name": name,
            "email": email,
            "password": password,
            "created_at": created_at.isoformat()
        }
        
        conn.commit()
        conn.close()
        return user_data, None

    def authenticate_user(self, email, password):
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM users WHERE email = %s AND password = %s", (email, password))
        user = cursor.fetchone()
        
        if user:
            # Convert datetime to string for JSON serialization
            if 'created_at' in user:
                user['created_at'] = user['created_at'].isoformat()
            conn.close()
            return user
            
        conn.close()
        return None

    def add_history(self, user_id, text, translation_type, detection_type='Sign'):
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        
        history_id = str(uuid.uuid4())
        timestamp = datetime.now()
        
        cursor.execute(
            "INSERT INTO history (id, user_id, text, translation_type, timestamp) VALUES (%s, %s, %s, %s, %s)",
            (history_id, user_id, text, translation_type, timestamp)
        )
        
        entry = {
            "id": history_id,
            "user_id": user_id,
            "text": text,
            "type": translation_type,
            "timestamp": timestamp.isoformat()
        }
        
        conn.commit()
        conn.close()
        return entry

    def get_user_history(self, user_id):
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM history WHERE user_id = %s ORDER BY timestamp DESC", (user_id,))
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            results.append({
                "id": row['id'],
                "user_id": row['user_id'],
                "text": row['text'],
                "type": row['translation_type'],
                "timestamp": row['timestamp'].isoformat()
            })
            
        conn.close()
        return results
