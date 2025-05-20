from subprocess import run
from discord import SyncWebhook, File
import pandas as pd
import matplotlib.pyplot as plt
from utils import sha256_benchmark, run_rust, run_js
import os
import tarfile


def run_process(command):
    return run(command, capture_output=True, shell=True, text=True,
               executable='/bin/bash')


# --------- parameters ------------

path = "/home/git-runner/out/"
os.makedirs(path, exist_ok=True)

repeat = 3
n_min = {}

n_min["concurrent_insert.js"] = 4_000_000 / 64 / 1000
n_min["concurrent_select.js"] = 400_000 / 64 / 1000
n_min["insert.js"] = 400_000 / 64 / 1000
n_min["select.js"] = 100_000 / 64 / 1000

steps = {}

step = 4

# --------- libs and rust benchmark names ----------
libs = ["scylladb-javascript-driver", "cassandra-driver"]
benchmarks = ["concurrent_insert.js", "insert.js", "concurrent_select.js",
              "select.js"]

name_rust = {}
name_rust["concurrent_insert.js"] = "concurrent_insert_benchmark"
name_rust["insert.js"] = "insert_benchmark"
name_rust["select.js"] = "select_benchmark"
name_rust["concurrent_select.js"] = "concurrent_select_benchmark"

files_list = []

df = {}
df_mem = {}
for ben in benchmarks:
    df[ben] = {}
    df_mem[ben] = {}

    steps[ben] = [int(n_min[ben] * (4 ** i)) for i in range(step)]

    # ---- RUST -----

    hash = sha256_benchmark(ben, 1, n_min[ben], step, repeat)
    print(ben, "rust", hash, len(hash))

    time_file = f"{path}{hash}_time.csv"
    memory_file = f"{path}{hash}_memory.csv"
    files_list.append(time_file)
    files_list.append(memory_file)

    if os.path.exists(time_file) and os.path.exists(memory_file):
        print("Read from file rust: " + ben)
        df[ben]["rust-driver"] = pd.read_csv(time_file, index_col=0)
        df_mem[ben]["rust-driver"] = pd.read_csv(memory_file, index_col=0)
    else:
        time_rust, mem_rust = run_rust(name_rust[ben], steps[ben], repeat)

        df[ben]["rust-driver"] = pd.DataFrame.from_dict(time_rust,
                                                        orient='index')
        df_mem[ben]["rust-driver"] = pd.DataFrame.from_dict(mem_rust,
                                                            orient='index')

        df[ben]["rust-driver"].to_csv(time_file)
        df_mem[ben]["rust-driver"].to_csv(memory_file)

    # ----- JS -----

    hash = sha256_benchmark(ben, 0, n_min[ben], step, repeat)

    time_file = f"{path}{hash}_time.csv"
    memory_file = f"{path}{hash}_memory.csv"

    files_list.append(time_file)
    files_list.append(memory_file)

    lib = "cassandra-driver"
    if os.path.exists(time_file) and os.path.exists(memory_file):
        print("Read from file JS: " + ben)
        df[ben][lib] = pd.read_csv(time_file, index_col=0)
        df_mem[ben][lib] = pd.read_csv(memory_file, index_col=0)
    else:
        time_js, mem_js = run_js(ben, steps[ben], repeat, lib)
        df[ben][lib] = pd.DataFrame.from_dict(time_js, orient='index')
        df_mem[ben][lib] = pd.DataFrame.from_dict(mem_js, orient='index')

        df[ben][lib].to_csv(time_file)
        df_mem[ben][lib].to_csv(memory_file)

    # ---- SCYLLA ---
    lib = "scylladb-javascript-driver"

    time_file = f"{path}{ben}_scylladb_javascript_driver_time.csv"
    memory_file = f"{path}{ben}_scylladb_javascript_driver_memory.csv"

    files_list.append(time_file)
    files_list.append(memory_file)

    time_js, mem_js = run_js(ben, steps[ben], repeat, lib)
    df[ben][lib] = pd.DataFrame.from_dict(time_js, orient='index')
    df_mem[ben][lib] = pd.DataFrame.from_dict(mem_js, orient='index')

    df[ben][lib].to_csv(time_file)
    df_mem[ben][lib].to_csv(memory_file)


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
        columns = list(data[lib].index)
        data[lib][f"{lib}_mean"] = data[lib].mean(axis=1)
        data[lib][f"{lib}_std"] = data[lib].std(axis=1)
        ax.errorbar(columns, data[lib][f"{lib}_mean"],
                    yerr=data[lib][f"{lib}_std"],
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
        columns = list(data[lib].index)
        data[lib][f"{lib}_mean"] = data[lib].mean(axis=1)
        data[lib][f"{lib}_std"] = data[lib].std(axis=1)
        ax.errorbar(columns, data[lib][f"{lib}_mean"],
                    yerr=data[lib][f"{lib}_std"],
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

with tarfile.open('results.tar.gz', 'w:gz') as tar:
    for path in files_list:
        tar.add(path, arcname=path.split('/')[-1])

wh.send(content="Results:", file=File("results.tar.gz"))
