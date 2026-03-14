import configparser

config = configparser.ConfigParser()
config.read("alembic.ini")
print("Alembic URL:", config["alembic"]["sqlalchemy.url"])
