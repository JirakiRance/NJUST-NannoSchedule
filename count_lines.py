#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import subprocess
import sys
from pathlib import Path

def get_git_files(repo_path):
    """返回 git 跟踪的文件列表（相对于仓库根目录）"""
    try:
        result = subprocess.run(
            ['git', 'ls-files'],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True
        )
        files = result.stdout.strip().splitlines()
        return [f for f in files if f]
    except subprocess.CalledProcessError:
        print("错误：无法执行 'git ls-files'，请确认当前目录位于 Git 仓库中。")
        sys.exit(1)

def is_code_file(filepath):
    """通过扩展名判断是否为代码文件（可自行增删）"""
    text_extensions = {
        '.py', '.js', '.html', '.css', '.jsonc',
        '.xml', '.svg', '.ini', '.cfg',
        '.conf', '.toml', '.lock', '.gitignore', '.license', '.rst'
    }
    ext = Path(filepath).suffix.lower()
    # 无扩展名的常见文件（如 LICENSE, Dockerfile, Makefile 等）
    if ext == '':
        name = Path(filepath).name
        return name in {'LICENSE', 'Dockerfile', 'Makefile', '.gitignore'}
    return ext in text_extensions

def count_lines(filepath, repo_path):
    """返回文件行数（非文本文件返回 0）"""
    full_path = Path(repo_path) / filepath
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            return sum(1 for _ in f)
    except (UnicodeDecodeError, OSError):
        return 0

def main():
    script_path = Path(__file__).resolve()
    repo_path = script_path.parent
    script_name = script_path.name

    files = get_git_files(repo_path)
    # 排除脚本自身
    files = [f for f in files if Path(f).name != script_name]

    total_lines = 0
    file_stats = {}

    for file in files:
        if not is_code_file(file):
            continue
        lines = count_lines(file, repo_path)
        if lines > 0:
            total_lines += lines
            file_stats[file] = lines

    print(f"代码总行数: {total_lines}")
    print(f"统计文件数: {len(file_stats)}")
    print("\n详细文件行数:")
    for file, lines in sorted(file_stats.items()):
        print(f"{lines:6} {file}")

if __name__ == "__main__":
    main()