FROM openjdk:17-jdk-slim

# Copiar o arquivo JAR da API para o contêiner
COPY target/amandita-api-1.0-SNAPSHOT.jar /amandita-api.jar

# Executar o JAR
ENTRYPOINT ["java", "-jar", "/amandita-api.jar"]

# Expor a porta da API
EXPOSE 8080
