# 构建阶段：Maven 编译 Spring Boot 后端
FROM maven:3.9-eclipse-temurin-11 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests

# 运行阶段：精简 JRE 运行 jar
FROM eclipse-temurin:11-jre
WORKDIR /app

COPY --from=build /app/target/ruwei-picture-backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENV TZ=Asia/Shanghai
ENTRYPOINT ["java", "-Duser.timezone=Asia/Shanghai", "-jar", "app.jar"]
