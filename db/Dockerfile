# Use a imagem oficial do PostgreSQL como base
FROM postgres:14.1

# Defina variáveis de ambiente
ENV POSTGRES_USER=amandita
ENV POSTGRES_PASSWORD=password
ENV POSTGRES_DB=amandita_db

# Defina o diretório de dados do PostgreSQL
ENV PGDATA=/data/postgres

# Copie scripts de inicialização (se necessário) para o contêiner
# Se você tiver arquivos SQL para importar, pode copiar para o diretório /docker-entrypoint-initdb.d
# COPY ./init-scripts/ /docker-entrypoint-initdb.d/

# Exponha a porta padrão do PostgreSQL
EXPOSE 5432
