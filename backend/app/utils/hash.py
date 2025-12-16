"""
哈希工具 - 用于去重
"""
import hashlib


def generate_hash(*args: str) -> str:
    """
    生成 SHA256 哈希值

    Args:
        *args: 要哈希的字符串参数

    Returns:
        64 字符的十六进制哈希字符串
    """
    content = "".join(str(arg) for arg in args if arg)
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def generate_short_code(length: int = 8) -> str:
    """
    生成短码（用于分享链接）

    Args:
        length: 短码长度，默认 8

    Returns:
        随机短码字符串
    """
    import secrets
    import string

    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))
