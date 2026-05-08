import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export interface GraphicCaptchaRef {
  captchaKey: string
  captchaCode: string
  refresh: () => void
}

interface GraphicCaptchaProps {
  onCodeChange: (code: string) => void
}

export const GraphicCaptcha = forwardRef<GraphicCaptchaRef, GraphicCaptchaProps>(
  function GraphicCaptcha({ onCodeChange }, ref) {
    const [captchaKey] = useState<string>(() => generateUUID())
    const [timestamp, setTimestamp] = useState<number>(Date.now())
    const [inputValue, setInputValue] = useState('')
    const imgRef = useRef<HTMLImageElement>(null)

    const captchaSrc = `/api/user/captcha?key=${captchaKey}&t=${timestamp}`

    const refresh = useCallback(() => {
      setTimestamp(Date.now())
    }, [])

    useImperativeHandle(ref, () => ({
      captchaKey,
      get captchaCode() {
        return inputValue
      },
      refresh,
    }), [captchaKey, inputValue, refresh])

    useEffect(() => {
      onCodeChange(inputValue)
    }, [inputValue, onCodeChange])

    return (
      <div className="captcha-row">
        <style>{`
          .captcha-row {
            display: flex;
            gap: 10px;
            align-items: stretch;
          }
          .captcha-input {
            flex: 6;
            padding: 14px 18px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.2s;
            background: #f8fafc;
            width: 100%;
          }
          .captcha-input:focus {
            outline: none;
            border-color: #3b82f6;
            background: #ffffff;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          .captcha-img-wrap {
            flex: 4;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            border-radius: 12px;
            cursor: pointer;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            transition: border-color 0.2s;
            position: relative;
            min-width: 0;
          }
          .captcha-img-wrap:hover {
            border-color: #93c5fd;
          }
          .captcha-img-wrap img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .captcha-img-tip {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.4);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 500;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
            border-radius: 12px;
          }
          .captcha-img-wrap:hover .captcha-img-tip {
            opacity: 1;
          }
        `}</style>
        <input
          className="captcha-input"
          placeholder="验证码"
          autoComplete="off"
          maxLength={6}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <div className="captcha-img-wrap" onClick={refresh} title="点击刷新验证码">
          <img
            ref={imgRef}
            src={captchaSrc}
            alt="验证码"
          />
          <span className="captcha-img-tip">点击刷新</span>
        </div>
      </div>
    )
  }
)
