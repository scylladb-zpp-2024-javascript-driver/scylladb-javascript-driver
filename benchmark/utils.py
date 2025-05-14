import hashlib
import re
from subprocess import run


def sha256sum(filename):
    h = hashlib.sha256()
    b = bytearray(128*1024)
    mv = memoryview(b)
    with open(filename, 'rb', buffering=0) as f:
        while n := f.readinto(mv):
            h.update(mv[:n])
    return h.hexdigest()


def run_process(command):
    return run(command, capture_output=True, shell=True, text=True,
               executable='/bin/bash')


# type:
#   0 - JS benchmark
#   1 - rust benchmark
def sha256_benchmark(benchmark, type, n, steps, repeat):
    name = ''.join(benchmark.split('.')[:-1])
    if type == 0:
        sha256_sum_b = sha256sum("benchmark/logic/"+benchmark)
    else:
        sha256_sum_b = sha256sum("benchmark/logic_rust/"+name+'.rs')

    sha256_sum_runner = sha256sum("benchmark/runner.py")

    return str(name + "_" + str(type) + "_" + (str(int(n)) + "_" + str(steps)
               + "_" + str(repeat) + "_b-" + sha256_sum_b
               + "_r-" + sha256_sum_runner))


# Function to parse the output from the time function.
def parse_time(s):
    log = s.stderr
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
    return total_seconds, max_rss / 1024


# Function to parse build time from cargo run output. Cargo run always prints
# build time to output. We must subtract this from execution time.
def extract_build_time(output):
    match = re.search(
        r'\[optimized\] target\(s\) in ([\d.]+)s',
        output)
    if match:
        return float(match.group(1))
    else:
        raise ValueError("Build time not found in the provided output.",
                         output)


def run_rust(ben, steps, repeat):
    # Build Rust benchmark
    data = run("cargo build --bin "+ben+" -r",
               capture_output=True, shell=True, text=True,
               executable='/bin/bash')

    if data.returncode != 0:
        raise Exception("Build error: " + ben)

    print("Build rust " + ben + " successfully.")

    time_dict = {}
    mem_dict = {}

    for n in steps:
        results = []
        results_mem = []
        for _ in range(repeat):
            data = run_process("CNT=" + str(int(n)) +
                               " /usr/bin/time -v cargo run --bin " +
                               ben + " -r ")

            if data.returncode != 0:
                raise Exception("Run error: Rust, ", data.stderr,
                                ben)

            s, mem = parse_time(data)
            offset = extract_build_time(data.stderr)

            results.append(s - offset)
            results_mem.append(mem)
        time_dict[n] = results
        mem_dict[n] = results_mem

    return time_dict, mem_dict


def run_js(ben, steps, repeat, driver):

    time_dict = {}
    mem_dict = {}

    for n in steps:
        results = []
        results_mem = []
        for _ in range(repeat):
            data = run_process("/usr/bin/time -v node benchmark/logic/" +
                               ben + " " + driver + " " + str(int(n)))

            if data.returncode != 0:
                raise Exception("Run error: ", driver, ben, data.stderr)

            s, mem = parse_time(data)
            results.append(s)
            results_mem.append(mem)

        time_dict[n] = results
        mem_dict[n] = results_mem

    return time_dict, mem_dict
