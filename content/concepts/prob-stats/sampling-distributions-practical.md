---
id: sampling-distributions-practical
title: Sampling Distributions and the CLT
subject: prob-stats
level: foundation
type: practical
practical: 6
syllabus: [UDSVI-006]
unit: 2
prerequisites: [sampling-distributions, sampling-techniques]
related: [hypothesis-testing-practical]
time: 60 min
status: draft
sources:
  - "NumPy documentation: Generator.choice, https://numpy.org/doc/stable/reference/random/generated/numpy.random.Generator.choice.html"
  - "Sahyadri Mart sales dataset: content/assets/data/sahyadri-mart-sales.md (synthetic, this site)"
---

## Aim

To conduct sampling analysis on a business dataset: draw repeated samples, study the sampling distribution of the mean, verify the central limit theorem, and compare simple random with stratified sampling.

## Concepts used

- [[sampling-techniques]]: simple random and stratified sampling.
- [[sampling-distributions]]: standard error and the central limit theorem.

## Setup (Colab)

[Open in Colab](https://colab.research.google.com/github/Prathameshv07/ai-ds-notes/blob/main/content/assets/notebooks/prob-stats/sampling-distributions-practical.ipynb). Nothing to install.

- **Dataset:** Sahyadri Mart daily sales (synthetic; its data card in `content/assets/data/` lists every column). One row = one store on one day.
- The 8,772 store-days are treated as the **population**, so we can compare every sample with the true answer.
- The outputs below come from pandas 3.0 and NumPy 2.5; the notebook gives identical numbers on pandas 2.2 and NumPy 2.0 (current Colab).
- Random numbers use `np.random.default_rng(2026)`, a fixed seed, so your results match these exactly when you run the cells in order.

## Code

### Step 1. The population: daily revenue on all 8,772 store-days

```python
# Step 1. The population: daily revenue on all 8,772 store-days
import numpy as np
import pandas as pd

url = ("https://raw.githubusercontent.com/Prathameshv07/ai-ds-notes/main/"
       "content/assets/data/sahyadri-mart-sales.csv")
df = pd.read_csv(url, parse_dates=["date"])
pop = df["revenue_inr"]
mu, sigma = pop.mean(), pop.std(ddof=0)
print(f"Population: N = {len(pop)}, mean Rs {mu:,.0f}, SD Rs {sigma:,.0f}, skewness {pop.skew():.2f}")
```

### Step 2. Two simple random samples of 30 store-days give different means

```python
# Step 2. Two simple random samples of 30 store-days give different means
rng = np.random.default_rng(2026)
for i in range(2):
    sample = rng.choice(pop.to_numpy(), size=30, replace=False)
    print(f"Sample {i + 1}: mean Rs {sample.mean():,.0f}")
```

### Step 3. 5,000 samples for each size: centre, spread and shape of the sample means

```python
# Step 3. 5,000 samples for each size: centre, spread and shape of the sample means
values = pop.to_numpy()
means = {}
for n in [5, 30, 100]:
    means[n] = np.array([rng.choice(values, size=n, replace=False).mean() for _ in range(5_000)])
    m = pd.Series(means[n])
    print(f"n = {n:>3}: mean of means Rs {m.mean():,.0f} | SD of means Rs {m.std():,.0f} "
          f"| sigma/sqrt(n) Rs {sigma / np.sqrt(n):,.0f} | skewness {m.skew():.2f}")
```

### Step 4. Plot: the population and the sampling distributions

```python
# Step 4. Plot: the population and the sampling distributions
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 4, figsize=(11, 2.8))
axes[0].hist(values / 1e5, bins=50, color="grey")
axes[0].set_title("Population (store-days)")
for ax, n in zip(axes[1:], [5, 30, 100]):
    ax.hist(means[n] / 1e5, bins=50, color="tab:blue")
    ax.set_title(f"Means of samples of {n}")
for ax in axes:
    ax.axvline(mu / 1e5, color="tab:orange", ls="--")
    ax.set_yticks([])
    ax.set_xlabel("Revenue (Rs lakh)")
plt.show()
```

### Step 5. Simple random vs stratified sampling (n = 60), 5,000 repetitions each

```python
# Step 5. Simple random vs stratified sampling (n = 60), 5,000 repetitions each
sm = df.loc[df["store_type"] == "Supermarket", "revenue_inr"].to_numpy()
ex = df.loc[df["store_type"] == "Express", "revenue_inr"].to_numpy()
n_sm = round(60 * len(sm) / len(pop))            # proportional allocation
n_ex = 60 - n_sm
srs = [rng.choice(values, 60, replace=False).mean() for _ in range(5_000)]
strat = [(rng.choice(sm, n_sm, replace=False).sum() + rng.choice(ex, n_ex, replace=False).sum()) / 60
         for _ in range(5_000)]
print(f"Allocation: {n_sm} Supermarket + {n_ex} Express store-days")
print(f"Simple random: mean Rs {np.mean(srs):,.0f}, SE Rs {np.std(srs, ddof=1):,.0f}")
print(f"Stratified   : mean Rs {np.mean(strat):,.0f}, SE Rs {np.std(strat, ddof=1):,.0f}")
```

### Step 6. Sampling distribution of a proportion: share of high-sales days in samples of 400

```python
# Step 6. Sampling distribution of a proportion: share of high-sales days in samples of 400
p90 = df.groupby("store_id")["revenue_inr"].transform(lambda s: s.quantile(0.9))
high = (df["revenue_inr"] > p90).astype(int).to_numpy()
p = high.mean()
props = np.array([rng.choice(high, 400, replace=False).mean() for _ in range(5_000)])
print(f"Population p = {p:.4f}")
print(f"Sample proportions: mean {props.mean():.4f}, SE {props.std(ddof=1):.4f} (formula {np.sqrt(p * (1 - p) / 400):.4f})")
```

## Output

### Step 1

```output
Population: N = 8772, mean Rs 444,043, SD Rs 336,298, skewness 1.26
```

### Step 2

```output
Sample 1: mean Rs 438,289
Sample 2: mean Rs 420,304
```

### Step 3

```output
n =   5: mean of means Rs 448,287 | SD of means Rs 151,518 | sigma/sqrt(n) Rs 150,397 | skewness 0.58
n =  30: mean of means Rs 444,833 | SD of means Rs 62,538 | sigma/sqrt(n) Rs 61,399 | skewness 0.24
n = 100: mean of means Rs 444,073 | SD of means Rs 33,745 | sigma/sqrt(n) Rs 33,630 | skewness 0.16
```

### Step 4

![Four histograms of revenue in rupees lakh. The population of store-days is strongly right-skewed with a long tail to about 30 lakh. The means of samples of size 5 are less skewed; of size 30, nearly symmetric; of size 100, a narrow symmetric bell. All are centred on the dashed population mean of about 4.4 lakh](../../assets/img/prob-stats/sampling-distributions-practical-step4.png)

### Step 5

```output
Allocation: 25 Supermarket + 35 Express store-days
Simple random: mean Rs 443,885, SE Rs 42,843
Stratified   : mean Rs 443,856, SE Rs 25,528
```

### Step 6

```output
Population p = 0.0999
Sample proportions: mean 0.1000, SE 0.0147 (formula 0.0150)
```

## Explanation

### Steps 1–2: the population and two samples

The population mean is ₹4,44,043 with SD ₹3,36,298 and skewness 1.26: strongly right-skewed, because Supermarkets sell far more than Express stores. Two random samples of 30 gave ₹4,38,289 and ₹4,20,304. ==Each sample mean misses the truth by a different amount.==

### Steps 3–4: the sampling distribution and the CLT

| n | Mean of 5,000 sample means | SD of means | σ/√n | Skewness of means |
|---|---|---|---|---|
| 5 | ₹4,48,287 | ₹1,51,518 | ₹1,50,397 | 0.58 |
| 30 | ₹4,44,833 | ₹62,538 | ₹61,399 | 0.24 |
| 100 | ₹4,44,073 | ₹33,745 | ₹33,630 | 0.16 |

- The sample means centre on the population mean: $\bar{x}$ is unbiased.
- ==The SD of the sample means matches σ/√n==: the standard error formula works.
- The skewness falls from 1.26 (population) to 0.16 at n = 100, and the histograms turn into bells: the central limit theorem.

### Step 5: simple random vs stratified sampling

Proportional allocation takes 25 Supermarket and 35 Express store-days (5 of the 12 stores are Supermarkets). Both methods are unbiased (means ≈ ₹4,43,900), but ==stratified sampling cut the standard error from ₹42,843 to ₹25,528==, about 40% less. Stratifying by store type removes the big between-type differences from the sampling error.

### Step 6: a proportion

High-sales days are 9.99% of the population. Sample proportions from samples of 400 had SE 0.0147, matching $\sqrt{p(1-p)/n} = 0.0150$.

## Try it

Repeat Step 3 for samples of 400. Compare the SD of the sample means with σ/√n, and with σ/√n multiplied by the finite population correction $\sqrt{(N - n)/(N - 1)}$.

Start from: `m400 = np.array([rng.choice(values, size=400, replace=False).mean() for _ in range(5_000)])`

> [!answer]- Answer
> ```python
> rng = np.random.default_rng(1)
> m400 = np.array([rng.choice(values, size=400, replace=False).mean() for _ in range(5_000)])
> fpc = np.sqrt((len(values) - 400) / (len(values) - 1))
> print(f"SD of means (n = 400): Rs {m400.std(ddof=1):,.0f}")
> print(f"sigma/sqrt(n): Rs {sigma / np.sqrt(400):,.0f}; with finite population correction: Rs {sigma / np.sqrt(400) * fpc:,.0f}")
> ```
> ```output
> SD of means (n = 400): Rs 16,454
> sigma/sqrt(n): Rs 16,815; with finite population correction: Rs 16,428
> ```
> Sampling 400 of 8,772 without replacement is almost 5% of the population, so the plain σ/√n slightly overstates the SE; the finite population correction fixes it. For samples under about 5% of the population it can be ignored.

## Viva questions

1. Why do two random samples from the same population give different means?
2. What should the mean of the sample means equal, and why?
3. Compare the SD of the sample means with σ/√n in Step 3. What does this confirm?
4. How does Step 4 illustrate the central limit theorem?
5. Why does stratified sampling give a smaller standard error here?
6. When is the finite population correction needed?

## Flashcards

NumPy: random sample of size n without replacement? :: rng.choice(values, size=n, replace=False)
SD of many sample means estimates what? :: The standard error σ/√n
Why did stratified sampling beat simple random sampling here? :: It removed the large between-store-type differences from the sampling error
Finite population correction factor? :: √((N − n)/(N − 1))

## Sources

- [NumPy documentation: Generator.choice](https://numpy.org/doc/stable/reference/random/generated/numpy.random.Generator.choice.html)
- Sahyadri Mart sales dataset: data card in `content/assets/data/sahyadri-mart-sales.md` (synthetic, this site)
