from subprocess import run
from discord import SyncWebhook, File
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import re
import os
# import argparse


# Function to parse the output from the time function
def parse_time(s):
    log = s.stderr
    # print(log)
    elapsed_match = re.search(r"Elapsed .*?: ([0-9:]+\.?[0-9]*)", log)
    if elapsed_match:
        elapsed_time = elapsed_match.group(1)
        parts = list(map(float, elapsed_time.split(':')))
        if len(parts) == 3:  # Format h:mm:ss.xx
            hours, minutes, seconds = parts
            total_seconds = hours * 3600 + minutes * 60 + seconds
        elif len(parts) == 2:  # Format m:ss.xx
            minutes, seconds = parts
            total_seconds = minutes * 60 + seconds
        else:  # Unexpected format
            total_seconds = parts[0]
    else:
        total_seconds = None

    # Extract max resident set size
    max_rss_match = re.search(r"Maximum resident set size \(kbytes\): (\d+)",
                              log)
    max_rss = int(max_rss_match.group(1)) if max_rss_match else None
    # print(total_seconds, max_rss)
    # print(log)
    return total_seconds, max_rss / 1024


def run_process(command):
    return run(command, capture_output=True, shell=True, text=True,
               executable='/bin/bash')


# --------- parameters ------------

''''
'parser = argparse.ArgumentParser()
parser.add_argument('min')
parser.add_argument('max')
parser.add_argument('step')
parser.add_argument('repeat')

args = parser.parse_args()
repeat = int(args.repeat)
n_min = int(args.min)
n_max = int(args.max)
step = int(args.step)
'''
repeat = 1
n_min = {}
# n_max = {}

""" n_min["concurent_insert.js"] = 2_000 """
""" n_min["insert.js"] = 200 """
""" n_min["select.js"] = 200 """


n_min["concurent_insert.js"] = 4_000_000 / 64
n_min["insert.js"] = 300_000 / 64
n_min["select.js"] = 15_000 / 64

steps = {}

step = 2

# --------- libs and rust benchmark names ----------
libs = ["scylladb-javascript-driver", "cassandra-driver"]
benchmarks = ["concurent_insert.js", "insert.js", "select.js"]

name_rust = {}
name_rust["concurent_insert.js"] = "concurrent_insert_benchmark"
name_rust["insert.js"] = "insert_benchmark"
name_rust["select.js"] = "select_benchmark"


df = {}
df_mem = {}
for ben in benchmarks:
    steps[ben] = [n_min[ben] * (4 ** i) for i in range(4)]
    print(steps[ben])
    df[ben] = pd.DataFrame(columns=['n', libs[0], libs[1], 'rust-driver'])
    df_mem[ben] = pd.DataFrame(columns=['n', libs[0], libs[1], 'rust-driver'])

    # Build rust benchmark
    data = run("cargo build --bin "+name_rust[ben]+" -r",
               capture_output=True, shell=True, text=True,
               executable='/bin/bash')

    if data.returncode != 0:
        raise Exception("Build error: " + name_rust[ben])

    print("Build rust " + name_rust[ben] + " successfully.")

    for n in steps[ben]:
        dict_time = {}
        dict_time['n'] = n
        dict_mem = {}
        dict_mem['n'] = n

        results = []
        results_mem = []
        # ------ rust -------
        for _ in range(repeat):
            data = run_process("CNT=" + str(n) +
                               " /usr/bin/time -v cargo run --bin " +
                               name_rust[ben] + " -r ")

            if data.returncode != 0:
                raise Exception("Run error: Rust, ", data.stderr,
                                name_rust[ben])

            s, mem = parse_time(data)
            offset = float(data.stderr.split('\n')[0].split('in ')[-1][:-1])
            # ugly offset calculation

            results.append(s - offset)
            results_mem.append(mem)
            # print(max(mem_usage))
        dict_time["rust-driver"] = results
        dict_mem["rust-driver"] = results_mem
        # ------ node -----
        for lib in libs:
            results = []
            results_mem = []
            for _ in range(repeat):
                data = run_process("/usr/bin/time -v node benchmark/logic/" +
                                   ben + " " + str(lib) + " " + str(n))

                if data.returncode != 0:
                    raise Exception("Run error: ", str(lib), ben, data.stderr)

                s, mem = parse_time(data)
                results.append(s)
                results_mem.append(mem)
                # print(max(mem_usage))
            dict_time[lib] = results
            dict_mem[lib] = results_mem
        print(ben, dict_time, dict_mem)
        df[ben].loc[len(df[ben])] = dict_time
        df_mem[ben].loc[len(df[ben])] = dict_mem

# ---------- PLOTS -------------

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
    ax.set_yscale('log')
    ax.set_title(f"Benchmark - {test_name.split('.')[0]}")
    ax.legend()


for j in range(len(df), rows_time * cols):
    axes[j].axis("off")

# --- Memory ---
start = rows_time * cols
memory_y = 0.47  # np. 0.50 (czy 0.48) – w zależności od liczby wierszy
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
# plt.show()

# ------ github ----------

data = run("git rev-parse --abbrev-ref HEAD",
           capture_output=True, shell=True, text=True, executable='/bin/bash')
branch = data.stdout.replace('\n', '')

data = run("git rev-parse HEAD",
           capture_output=True, shell=True, text=True, executable='/bin/bash')
commit = data.stdout.replace('\n', '')

wh = SyncWebhook.from_url(os.environ['DISCORD_BENCHMARKS_WEBHOOK'])

wh.send(content="[TEST CI] Branch: " + branch +
        " commit: https://github.com/scylladb-zpp-2024-javascript-driver/" +
        "scylladb-javascript-driver/commit/"
        + commit, file=File("graph.png"))
