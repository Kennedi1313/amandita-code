# -------- STAGE 1: build --------
FROM maven:3.9.6-eclipse-temurin-21 AS build

WORKDIR /app

# Copia o descritor e o código da API
COPY pom.xml .
COPY src ./src

# Build do JAR
RUN --mount=type=cache,target=/root/.m2 mvn clean package -DskipTests

# -------- STAGE 2: runtime --------
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*jar app.jar
RUN addgroup -S kizi && adduser -S kizi -G kizi \
    && mkdir -p /home/kizi/.amigoscode/s3 \
    && chown -R kizi:kizi /app /home/kizi

ENV HOME=/home/kizi
USER kizi

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
