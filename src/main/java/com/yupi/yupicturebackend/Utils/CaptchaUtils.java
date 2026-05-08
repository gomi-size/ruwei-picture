package com.yupi.yupicturebackend.Utils;

import com.wf.captcha.ArithmeticCaptcha;
import com.wf.captcha.SpecCaptcha;
import com.wf.captcha.base.Captcha;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpServletResponse;
import java.awt.*;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * EasyCaptcha + Redis 图形验证码工具类
 */
@Component
public class CaptchaUtils {

    // Redis Key 的前缀
    private static final String CAPTCHA_REDIS_PREFIX = "CAPTCHA:CODE:";
    // 验证码有效期（秒）
    private static final long CAPTCHA_EXPIRATION = 2;

    // 静态的 RedisTemplate，供静态方法使用
    private static StringRedisTemplate redisTemplate;

    /**
     * 巧妙利用 Spring 的 setter 注入，给静态变量赋值
     */
    @Autowired
    public void setRedisTemplate(StringRedisTemplate stringRedisTemplate) {
        CaptchaUtils.redisTemplate = stringRedisTemplate;
    }

    /**
     * 1. 生成【算术题】验证码并直接写入 Response
     *
     * @param captchaKey 前端传来的唯一标识 (UUID)
     * @param response   HttpServletResponse
     */
    public static void generateMathCaptcha(String captchaKey, HttpServletResponse response) throws IOException {
        setHeader(response);

        // 创建算术验证码，宽130，高48，两位数运算
        ArithmeticCaptcha captcha = new ArithmeticCaptcha(130, 48);
        captcha.setLen(2);

        // 获取验证码的答案
        String answer = captcha.text().toLowerCase();

        // 存入 Redis，设置过期时间30秒过期
        redisTemplate.opsForValue().set(CAPTCHA_REDIS_PREFIX + captchaKey, answer, CAPTCHA_EXPIRATION, TimeUnit.MINUTES);

        // 将图片输出到 Response 流中
        captcha.out(response.getOutputStream());
    }

    /**
     * 2. 生成【静态字母】验证码并直接写入 Response
     */
    public static void generateStaticCaptcha(String captchaKey, HttpServletResponse response) throws IOException, FontFormatException {
        setHeader(response);

        SpecCaptcha captcha = new SpecCaptcha(130, 48, 4);
        captcha.setFont(Captcha.FONT_1);
        
        String answer = captcha.text().toLowerCase();

        // 存入 Redis
        redisTemplate.opsForValue().set(CAPTCHA_REDIS_PREFIX + captchaKey, answer, CAPTCHA_EXPIRATION, TimeUnit.MINUTES);

        captcha.out(response.getOutputStream());
    }

    /**
     * 3. 校验验证码 (统一校验方法)
     *
     * @param captchaKey    前端传来的唯一标识 (UUID)
     * @param userInputCode 用户输入的验证码答案
     * @return true 校验通过，false 校验失败
     */
    public static boolean verify(String captchaKey, String userInputCode) {
        if (captchaKey == null || userInputCode == null || userInputCode.trim().isEmpty()) {
            return false;
        }

        String redisKey = CAPTCHA_REDIS_PREFIX + captchaKey;

        // 从 Redis 中获取真实答案
        String realCode = redisTemplate.opsForValue().get(redisKey);
        
        if (realCode == null) {
            return false; // 验证码已过期或不存在
        }

        // 比对成功或失败，都必须立刻从 Redis 中删除（阅后即焚，防止暴力破解）
        redisTemplate.delete(redisKey);

        // 忽略大小写进行比对
        return realCode.equalsIgnoreCase(userInputCode.trim());
    }

    /**
     * 设置响应头，防止浏览器缓存验证码图片
     */
    private static void setHeader(HttpServletResponse response) {
        response.setContentType("image/png");
        response.setHeader("Pragma", "No-cache");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response.setDateHeader("Expires", 0);
    }
}