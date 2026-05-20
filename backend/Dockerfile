# -------- STAGE 1: build --------
FROM maven:3.9.6-eclipse-temurin-21 AS build

WORKDIR /app

# Copia apenas o necessário primeiro (cache)
COPY pom.xml .
RUN mvn dependency:go-offline

# Copia o resto do código
COPY src ./src

# Build do JAR
RUN mvn clean package -DskipTests

# -------- STAGE 2: runtime --------
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
