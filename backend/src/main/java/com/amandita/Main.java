package com.amandita;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories
public class Main {

    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(Main.class);
        application.setAdditionalProfiles("ssl");
        application.run(args);
    }

    @Bean
    CommandLineRunner runner() {
        return args -> {};
    }
}
