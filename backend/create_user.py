from models.user import User
from database import SessionLocal
from passlib.context import CryptContext

db = SessionLocal()
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

try:
    user = User(
        email='student@example.com',
        password=pwd_context.hash('password123'),
        username='testuser',
        role='student'
    )
    
    db.add(user)
    db.commit()
    print('✅ User created successfully!')
except Exception as e:
    print(f'❌ Error: {e}')
    db.rollback()
finally:
    db.close()
