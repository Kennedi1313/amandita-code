package com.amandita.smtp;

import okhttp3.*;

import java.io.IOException;

public class EmailSender {

    private static final String FROM = "amandita.pratas@outlook.com";
    private static final String MAILTRAP_API_TOKEN = "ba836688f80debf2e7ce354c5980729a";

    public static void sendPaymentApprovedEmail(String customerEmail, String customerName) {
        try {
            sendEmail(customerEmail, customerName);
        } catch (Exception e) {
            System.out.println(e.getMessage());
        }
    }

    public static void sendEmail(String to, String name) throws IOException {
        OkHttpClient client = new OkHttpClient();

        MediaType mediaType = MediaType.parse("application/json");
        //String bodyText = "{\"from\":{\"email\":\""+ from +"\",\"name\":\"Amandita Pratas\"},\"to\":[{\"email\":\""+to+"\"}],\"subject\":\""+subject+"\",\"text\":\""+text+"\",\"category\":\"AMANDITAPRATAS\"}";
        String bodyText = "{\"from\":{\"email\":\"hello@amanditapratas.com.br\",\"name\":\"Amandita Pratas\"},\"to\":[{\"email\":\""+to+"\"}],\"template_uuid\":\"6ba15e4a-f65d-4d62-ad36-a247310290b7\",\"template_variables\":{\"first_name\":\""+name+"\",\"company_info_name\":\"Amandita Pratas\",\"company_info_address\":\"Av. Antonio Basilio, 3627 - Lagoa Nova\",\"company_info_city\":\"Natal\",\"company_info_zip_code\":\"59056-275\",\"company_info_country\":\"Brasil\"}}";

        RequestBody body = RequestBody.create(mediaType, bodyText);
        Request request = new Request.Builder()
                .url("https://send.api.mailtrap.io/api/send")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Accept", "application/json")
                .addHeader("Authorization", "Bearer " + MAILTRAP_API_TOKEN)
                .build();

        Response response = client.newCall(request).execute();
        if (response.code() != 200) {
            throw new IOException(response.message());
        }
    }
}
