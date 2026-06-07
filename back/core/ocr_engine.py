import numpy as np
from PIL import Image
import io
from pathlib import Path


class OCR:
    def __init__(self):
        model_path = Path(__file__).parent / "captcha_model.npz"

        data = np.load(model_path, allow_pickle=True)

        self.W1 = data["W1"]
        self.b1 = data["b1"]
        self.W2 = data["W2"]
        self.b2 = data["b2"]

        self.charset = list(data["charset"])

        self.img_h = int(data["img_h"])
        self.img_w = int(data["img_w"])

        self.num_chars = int(data["num_chars"])
        self.num_classes = len(self.charset)

    def classification(self, img_bytes: bytes) -> str:
        img = (
            Image.open(io.BytesIO(img_bytes))
            .convert("L")
            .resize((self.img_w, self.img_h))
        )

        x = (
            np.array(img, dtype=np.float32)
            .flatten()
            / 255.0
        )

        x = x.reshape(1, -1)

        z1 = x @ self.W1 + self.b1
        a1 = np.maximum(0, z1)

        z2 = a1 @ self.W2 + self.b2

        result = ""

        for i in range(self.num_chars):
            start = i * self.num_classes
            end = start + self.num_classes

            idx = np.argmax(z2[0, start:end])

            result += self.charset[idx]

        return result