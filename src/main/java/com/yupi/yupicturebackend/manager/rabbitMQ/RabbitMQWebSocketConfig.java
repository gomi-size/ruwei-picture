package com.yupi.yupicturebackend.manager.rabbitMQ;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
public class RabbitMQWebSocketConfig {
    // 交换机名称
    public static final String PICTURE_EDIT_EXCHANGE = "picture_edit_exchange";

    // 1. 定义扇形交换机
    @Bean
    public FanoutExchange pictureEditExchange() {
        return new FanoutExchange(PICTURE_EDIT_EXCHANGE);
    }

    // 2. 定义每个实例独占的匿名队列（断开即销毁）
    @Bean
    public Queue instanceQueue() {
        Queue queue = new AnonymousQueue();
        // 【关键修复】手动移除旧版 Spring AMQP 默认附加的已被新版 RabbitMQ 禁用的参数
        queue.removeArgument("x-queue-master-locator");
        return queue;
    }

    // 3. 绑定队列到交换机
    @Bean
    public Binding binding(Queue instanceQueue, FanoutExchange pictureEditExchange) {
        return BindingBuilder.bind(instanceQueue).to(pictureEditExchange);
    }
}