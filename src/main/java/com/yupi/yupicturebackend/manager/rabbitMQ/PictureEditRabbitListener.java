package com.yupi.yupicturebackend.manager.rabbitMQ;

import cn.hutool.json.JSONUtil;
import com.yupi.yupicturebackend.manager.websocket.PictureEditHandler;
import com.yupi.yupicturebackend.manager.websocket.model.PictureEditResponseMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;

/**
 * RabbitMq消费者
 */
@Slf4j
@Component
public class PictureEditRabbitListener {
    @Resource
    private PictureEditHandler pictureEditHandler;

    // 监听当前实例生成的匿名队列
    @RabbitListener(queues = "#{instanceQueue.name}")
    public void receiveMessage(String message) {
        PictureEditResponseMessage responseMessage = JSONUtil.toBean(message, PictureEditResponseMessage.class);
        try {
            // 真正发给连接到本机的用户
            pictureEditHandler.broadcastToLocalPicture(responseMessage.getPictureId(), responseMessage);
        } catch (Exception e) {
            log.error("本地广播失败", e);
        }
    }
}