from subprocess import run
from discord import SyncWebhook, File
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from utils import sha256_benchmark, run_rust, run_js
import os


def run_process(command):
    return run(command, capture_output=True, shell=True, text=True,
               executable='/bin/bash')


# --------- parameters ------------

repeat = 3
n_min = {}

n_min["concurrent_insert.js"] = 4_000_000 / 64
n_min["concurrent_select.js"] = 400_000 / 64
n_min["insert.js"] = 400_000 / 64
n_min["select.js"] = 100_000 / 64

steps = {}

step = 4

# --------- libs and rust benchmark names ----------
libs = ["scylladb-javascript-driver", "cassandra-driver"]
benchmarks = ["concurrent_insert.js", "insert.js", "select.js",
              "concurrent_select.js"]

name_rust = {}
name_rust["concurrent_insert.js"] = "concurrent_insert_benchmark"
name_rust["insert.js"] = "insert_benchmark"
name_rust["select.js"] = "select_benchmark"
name_rust["concurrent_select.js"] = "concurrent_select_benchmark"


df = {}
df_mem = {}
for ben in benchmarks:
    df[ben] = {}
    df_mem[ben] = {}

    steps[ben] = [n_min[ben] * (4 ** i) for i in range(step)]

    hash = sha256_benchmark(ben, 1, n_min[ben])
    print(ben, "rust", hash, len(hash))

    time_rust, mem_rust = run_rust(name_rust[ben], steps[ben], repeat)

    df[ben]["rust-driver"] = pd.DataFrame.from_dict(time_rust, orient='index')
    df_mem[ben]["rust-driver"] = pd.DataFrame.from_dict(mem_rust,
                                                        orient='index')

    hash = sha256_benchmark(ben, 0, n_min[ben])
    print(ben, "js", hash, len(hash))

    for lib in libs:
        time_js, mem_js = run_js(ben, steps[ben], repeat, lib)
        df[ben][lib] = pd.DataFrame.from_dict(time_js, orient='index')
        df_mem[ben][lib] = pd.DataFrame.from_dict(mem_js, orient='index')


# ---------- plots -------------

libs.append("rust-driver")

cols = 3
rows_time = (len(df) + cols - 1) // cols
rows_mem = (len(df_mem) + cols - 1) // cols
total_rows = rows_time + rows_mem

fig, axes = plt.subplots(total_rows, cols, figsize=(15, 5 * total_rows),
                         facecolor="white")
axes = axes.flatten()

# ---  Time ---
fig.text(0.5, 0.98, "Time", ha="center", fontsize=16, fontweight="bold")
for i, (test_name, data) in enumerate(df.items()):
    ax = axes[i]
    ax.set_facecolor("white")

    for lib in libs:
        data[f"{lib}_mean"] = data[lib].apply(np.mean)
        data[f"{lib}_std"] = data[lib].apply(np.std)
        ax.errorbar(data["n"], data[f"{lib}_mean"], yerr=data[f"{lib}_std"],
                    label=lib, linestyle="-", linewidth=2, capsize=5)

    ax.set_xlabel("Number of requests")
    ax.set_ylabel("Time [s]")
    ax.set_xscale('log')
    ax.set_yscale('log')
    ax.set_title(f"Benchmark - {test_name.split('.')[0]}")
    ax.legend()


for j in range(len(df), rows_time * cols):
    axes[j].axis("off")

# --- memory ---
start = rows_time * cols
memory_y = 0.47
fig.text(0.5, memory_y, "Memory", ha="center", fontsize=16, fontweight="bold")
for i, (test_name, data) in enumerate(df_mem.items()):
    ax = axes[start + i]
    ax.set_facecolor("white")

    for lib in libs:
        data[f"{lib}_mean"] = data[lib].apply(np.mean)
        data[f"{lib}_std"] = data[lib].apply(np.std)
        ax.errorbar(data["n"], data[f"{lib}_mean"], yerr=data[f"{lib}_std"],
                    label=lib, linestyle="-", linewidth=2, capsize=5)

    ax.set_xlabel("Number of requests")
    ax.set_ylabel("Memory [MB]")
    ax.set_xscale('log')
    ax.set_yscale('log')
    ax.set_title(f"Benchmark - {test_name.split('.')[0]}")
    ax.legend()

for j in range(start + len(df_mem), total_rows * cols):
    axes[j].axis("off")

plt.style.use('default')
plt.tight_layout(rect=[0, 0, 1, 0.96])
plt.subplots_adjust(hspace=0.35)
# plt.savefig("graph.svg", format="svg", dpi=300)
plt.savefig("graph.png")

# ------ github ----------

data = run("git rev-parse --abbrev-ref HEAD",
           capture_output=True, shell=True, text=True, executable='/bin/bash')
branch = data.stdout.replace('\n', '')

data = run("git rev-parse HEAD",
           capture_output=True, shell=True, text=True, executable='/bin/bash')
commit = data.stdout.replace('\n', '')

wh = SyncWebhook.from_url(os.environ['DISCORD_BENCHMARKS_WEBHOOK'])

wh.send(content="Branch: " + branch +
        " commit: https://github.com/scylladb-zpp-2024-javascript-driver/" +
        "scylladb-javascript-driver/commit/"
        + commit, file=File("graph.png"))
