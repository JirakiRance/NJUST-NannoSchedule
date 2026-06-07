"""
纯 numpy 验证码识别模型训练脚本
依赖：numpy, pillow（都是 Chaquopy 可装的）
输出：captcha_model.npz（权重文件，打包进 APK）
"""

import numpy as np
import json
import os
from PIL import Image

# ===================== 配置 =====================
DATASET_DIR = "captcha_dataset"
MODEL_PATH  = "captcha_model.npz"
IMG_H, IMG_W = 22, 62          # 原始验证码尺寸
NUM_CHARS    = 4               # 固定4位
CHARSET      = sorted(list("123bcmnvxz"))  # 采集到的10个字符
NUM_CLASSES  = len(CHARSET)    # 10
EPOCHS       = 60
BATCH_SIZE   = 32
LR           = 0.01
CHAR2IDX     = {c: i for i, c in enumerate(CHARSET)}

print(f"字符集({NUM_CLASSES}个): {CHARSET}")

# ===================== 数据加载 =====================
def load_dataset():
    labels_path = os.path.join(DATASET_DIR, "labels.json")
    with open(labels_path) as f:
        labels = json.load(f)

    X, Y = [], []
    skipped = 0
    for filename, label in labels.items():
        # 过滤：标签必须是4位且全在字符集内
        if len(label) != 4 or not all(c in CHAR2IDX for c in label):
            skipped += 1
            continue
        img_path = os.path.join(DATASET_DIR, filename)
        if not os.path.exists(img_path):
            skipped += 1
            continue
        img = Image.open(img_path).convert("L").resize((IMG_W, IMG_H))
        arr = np.array(img, dtype=np.float32) / 255.0  # (22, 62)
        X.append(arr.flatten())  # (1364,)
        # one-hot for each of 4 chars
        y = np.zeros(NUM_CHARS * NUM_CLASSES, dtype=np.float32)
        for i, c in enumerate(label):
            y[i * NUM_CLASSES + CHAR2IDX[c]] = 1.0
        Y.append(y)

    X = np.array(X)  # (N, 1364)
    Y = np.array(Y)  # (N, 40)
    print(f"加载完成: {len(X)} 张（跳过 {skipped} 张）")
    return X, Y

# ===================== 模型定义（两层全连接）=====================
# 结构: 1364 → 256 → 40
# 输出层拆成4个独立的 softmax（每个字符位置10类）

def relu(x):
    return np.maximum(0, x)

def relu_grad(x):
    return (x > 0).astype(np.float32)

def softmax(x):
    e = np.exp(x - x.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def cross_entropy_loss(pred, target):
    # pred: (N, 40), target: (N, 40) one-hot
    loss = 0.0
    for i in range(NUM_CHARS):
        p = softmax(pred[:, i*NUM_CLASSES:(i+1)*NUM_CLASSES])
        t = target[:, i*NUM_CLASSES:(i+1)*NUM_CLASSES]
        loss += -np.sum(t * np.log(p + 1e-9)) / len(pred)
    return loss / NUM_CHARS

def init_weights(input_dim=1364, hidden_dim=256, output_dim=40):
    np.random.seed(42)
    W1 = np.random.randn(input_dim, hidden_dim).astype(np.float32) * np.sqrt(2.0 / input_dim)
    b1 = np.zeros(hidden_dim, dtype=np.float32)
    W2 = np.random.randn(hidden_dim, output_dim).astype(np.float32) * np.sqrt(2.0 / hidden_dim)
    b2 = np.zeros(output_dim, dtype=np.float32)
    return W1, b1, W2, b2

def forward(X, W1, b1, W2, b2):
    z1 = X @ W1 + b1      # (N, 256)
    a1 = relu(z1)
    z2 = a1 @ W2 + b2     # (N, 40)
    return z1, a1, z2

def backward(X, z1, a1, z2, Y, W1, W2):
    N = len(X)
    # 输出层梯度（softmax + cross_entropy 合并）
    dz2 = np.zeros_like(z2)
    for i in range(NUM_CHARS):
        p = softmax(z2[:, i*NUM_CLASSES:(i+1)*NUM_CLASSES])
        t = Y[:, i*NUM_CLASSES:(i+1)*NUM_CLASSES]
        dz2[:, i*NUM_CLASSES:(i+1)*NUM_CLASSES] = (p - t) / N

    dW2 = a1.T @ dz2
    db2 = dz2.sum(axis=0)
    da1 = dz2 @ W2.T
    dz1 = da1 * relu_grad(z1)
    dW1 = X.T @ dz1
    db1 = dz1.sum(axis=0)
    return dW1, db1, dW2, db2

def predict_chars(z2):
    """返回每张图片的预测字符串列表"""
    results = []
    for row in z2:
        pred = ""
        for i in range(NUM_CHARS):
            idx = np.argmax(row[i*NUM_CLASSES:(i+1)*NUM_CLASSES])
            pred += CHARSET[idx]
        results.append(pred)
    return results

def accuracy(z2, Y):
    preds = predict_chars(z2)
    correct_chars = 0
    correct_full  = 0
    total_chars   = len(Y) * NUM_CHARS
    for j, (pred, y) in enumerate(zip(preds, Y)):
        true_label = ""
        for i in range(NUM_CHARS):
            true_label += CHARSET[np.argmax(y[i*NUM_CLASSES:(i+1)*NUM_CLASSES])]
        if pred == true_label:
            correct_full += 1
        for a, b in zip(pred, true_label):
            if a == b:
                correct_chars += 1
    return correct_chars / total_chars, correct_full / len(Y)

# ===================== 训练 =====================
print("\n加载数据集...")
X, Y = load_dataset()

# 打乱并划分训练/验证集 (90/10)
idx = np.random.permutation(len(X))
X, Y = X[idx], Y[idx]
split = int(len(X) * 0.9)
X_train, Y_train = X[:split], Y[:split]
X_val,   Y_val   = X[split:], Y[split:]
print(f"训练集: {len(X_train)} 张，验证集: {len(X_val)} 张")

W1, b1, W2, b2 = init_weights()

print(f"\n开始训练（{EPOCHS} 轮）...\n{'='*55}")
best_val_acc = 0.0
best_weights = None

for epoch in range(1, EPOCHS + 1):
    # mini-batch SGD
    perm = np.random.permutation(len(X_train))
    X_train, Y_train = X_train[perm], Y_train[perm]

    for start in range(0, len(X_train), BATCH_SIZE):
        Xb = X_train[start:start+BATCH_SIZE]
        Yb = Y_train[start:start+BATCH_SIZE]
        z1, a1, z2 = forward(Xb, W1, b1, W2, b2)
        dW1, db1, dW2, db2 = backward(Xb, z1, a1, z2, Yb, W1, W2)
        W1 -= LR * dW1
        b1 -= LR * db1
        W2 -= LR * dW2
        b2 -= LR * db2

    # 验证
    _, _, z2_train = forward(X_train, W1, b1, W2, b2)
    _, _, z2_val   = forward(X_val,   W1, b1, W2, b2)
    train_char_acc, train_full_acc = accuracy(z2_train, Y_train)
    val_char_acc,   val_full_acc   = accuracy(z2_val,   Y_val)
    loss = cross_entropy_loss(z2_val, Y_val)

    print(f"Epoch {epoch:3d}/{EPOCHS} | loss={loss:.4f} | "
          f"train字符={train_char_acc*100:.1f}% 全词={train_full_acc*100:.1f}% | "
          f"val字符={val_char_acc*100:.1f}% 全词={val_full_acc*100:.1f}%")

    if val_full_acc > best_val_acc:
        best_val_acc = val_full_acc
        best_weights = (W1.copy(), b1.copy(), W2.copy(), b2.copy())

# ===================== 保存最优模型 =====================
W1, b1, W2, b2 = best_weights
np.savez_compressed(MODEL_PATH,
    W1=W1, b1=b1, W2=W2, b2=b2,
    charset=np.array(CHARSET),
    img_h=np.array(IMG_H), img_w=np.array(IMG_W),
    num_chars=np.array(NUM_CHARS)
)

print(f"\n{'='*55}")
print(f"训练完成！最优验证集全词准确率: {best_val_acc*100:.1f}%")
print(f"模型已保存: {MODEL_PATH}")
print(f"文件大小: {os.path.getsize(MODEL_PATH)/1024:.1f} KB")
print(f"\n下一步：运行 test_numpy_ocr.py 测试实际登录准确率")