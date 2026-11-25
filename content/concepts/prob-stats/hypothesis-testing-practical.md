---
id: hypothesis-testing-practical
title: Confidence Intervals and Hypothesis Tests on Sales Data
subject: prob-stats
level: foundation
type: practical
practical: 7
syllabus: [UDSVI-006]
unit: 2
prerequisites: [hypothesis-testing, confidence-intervals]
related: [sampling-distributions-practical]
time: 60 min
status: draft
sources:
  - "SciPy documentation: scipy.stats.ttest_1samp, ttest_ind and t, https://docs.scipy.org/doc/scipy/reference/stats.html"
  - "Sahyadri Mart sales dataset: content/assets/data/sahyadri-mart-sales.md (synthetic, this site)"
---

## Aim

To calculate confidence intervals and perform hypothesis tests (one-sample and two-sample t-tests) on a business dataset, and to interpret them for a manager.

## Concepts used

- [[confidence-intervals]]: t-intervals and what 95% confidence means.
- [[hypothesis-testing]]: H0 and H1, p-values, Type I and II errors.

## Setup (Colab)

[Open in Colab](https://colab.research.google.com/github/Prathameshv07/ai-ds-notes/blob/main/content/assets/notebooks/prob-stats/hypothesis-testing-practical.ipynb). Nothing to install.

- **Dataset:** Sahyadri Mart daily sales (synthetic; its data card in `content/assets/data/` lists every column). One row = one store on one day.
- Steps 1–4 use a random sample of 36 days from S05 (Pune Express); Steps 5–6 use all its ordinary (non-festival) days.
- The outputs below come from pandas 3.0 and NumPy 2.5; the notebook gives identical numbers on pandas 2.2 and NumPy 2.0 (current Colab).
- Random numbers use `np.random.default_rng(2026)`, a fixed seed, so your results match these exactly when you run the cells in order.

## Code

### Step 1. Load the data and take a random sample of 36 days from the Pune Express store (S05)

```python
# Step 1. Load the data and take a random sample of 36 days from the Pune Express store (S05)
import numpy as np
import pandas as pd
from scipy import stats

url = ("https://raw.githubusercontent.com/Prathameshv07/ai-ds-notes/main/"
       "content/assets/data/sahyadri-mart-sales.csv")
df = pd.read_csv(url, parse_dates=["date"])
s05 = df[df["store_id"] == "S05"]
rng = np.random.default_rng(2026)
sample = s05["footfall"].to_numpy()[rng.choice(len(s05), size=36, replace=False)]
n, xbar, s = len(sample), sample.mean(), sample.std(ddof=1)
print(f"n = {n}, sample mean {xbar:.1f}, sample SD {s:.1f}")
```

### Step 2. 95% confidence interval for the mean daily footfall, by formula and with scipy

```python
# Step 2. 95% confidence interval for the mean daily footfall, by formula and with scipy
se = s / np.sqrt(n)
t_star = stats.t.ppf(0.975, df=n - 1)
print(f"t* = {t_star:.3f}, SE = {se:.2f}, margin of error = {t_star * se:.1f}")
print(f"By formula: ({xbar - t_star * se:.1f}, {xbar + t_star * se:.1f})")
lo, hi = stats.t.interval(0.95, df=n - 1, loc=xbar, scale=se)
print(f"With scipy: ({lo:.1f}, {hi:.1f})")
print(f"True mean of all 731 days: {s05['footfall'].mean():.1f}")
```

### Step 3. What does 95% mean? Build 1,000 intervals from 1,000 samples and count the hits

```python
# Step 3. What does 95% mean? Build 1,000 intervals from 1,000 samples and count the hits
true_mean = s05["footfall"].mean()
values = s05["footfall"].to_numpy()
hits = 0
for _ in range(1_000):
    x = rng.choice(values, size=36, replace=False)
    lo, hi = stats.t.interval(0.95, df=35, loc=x.mean(), scale=x.std(ddof=1) / 6)
    hits += lo <= true_mean <= hi
print(f"Intervals containing the true mean: {hits} of 1,000")
```

### Step 4. One-sample t-test. Head office claims S05 averages 1,300 visitors a day.

```python
# Step 4. One-sample t-test. Head office claims S05 averages 1,300 visitors a day.
# H0: mu = 1300, H1: mu != 1300, alpha = 0.05
res = stats.ttest_1samp(sample, popmean=1300)
print(f"t = {res.statistic:.3f}, two-tailed p-value = {res.pvalue:.4f}")
print("Decision:", "reject H0" if res.pvalue <= 0.05 else "fail to reject H0")
```

### Step 5. Two-sample t-test: do display days have higher footfall? (S05, ordinary days only)

```python
# Step 5. Two-sample t-test: do display days have higher footfall? (S05, ordinary days only)
ordinary = s05[s05["is_festival"] == 0]
with_d = ordinary.loc[ordinary["display"] == 1, "footfall"]
without = ordinary.loc[ordinary["display"] == 0, "footfall"]
res = stats.ttest_ind(with_d, without, equal_var=False)          # Welch's t-test
print(f"Display days: n = {len(with_d)}, mean {with_d.mean():.1f} | other days: n = {len(without)}, mean {without.mean():.1f}")
print(f"Difference {with_d.mean() - without.mean():.1f} visitors, t = {res.statistic:.3f}, p-value = {res.pvalue:.4f}")
print("Decision at alpha 0.05:", "reject H0" if res.pvalue <= 0.05 else "fail to reject H0")
```

### Step 6. Two-sample t-test: discount days vs no-discount days, with a CI for the difference

```python
# Step 6. Two-sample t-test: discount days vs no-discount days, with a CI for the difference
disc = ordinary.loc[ordinary["discount_pct"] > 0, "footfall"]
none = ordinary.loc[ordinary["discount_pct"] == 0, "footfall"]
res = stats.ttest_ind(disc, none, equal_var=False)
ci = res.confidence_interval(0.95)
print(f"Discount days: n = {len(disc)}, mean {disc.mean():.1f} | no discount: n = {len(none)}, mean {none.mean():.1f}")
print(f"Difference {disc.mean() - none.mean():.1f} visitors, 95% CI ({ci.low:.1f}, {ci.high:.1f})")
print(f"t = {res.statistic:.2f}, p-value = {res.pvalue:.2e}")
```

## Output

### Step 1

```output
n = 36, sample mean 1276.6, sample SD 280.3
```

### Step 2

```output
t* = 2.030, SE = 46.72, margin of error = 94.8
By formula: (1181.7, 1371.4)
With scipy: (1181.7, 1371.4)
True mean of all 731 days: 1257.3
```

### Step 3

```output
Intervals containing the true mean: 952 of 1,000
```

### Step 4

```output
t = -0.502, two-tailed p-value = 0.6189
Decision: fail to reject H0
```

### Step 5

```output
Display days: n = 222, mean 1261.8 | other days: n = 477, mean 1226.4
Difference 35.4 visitors, t = 1.922, p-value = 0.0553
Decision at alpha 0.05: fail to reject H0
```

### Step 6

```output
Discount days: n = 310, mean 1311.0 | no discount: n = 389, mean 1179.2
Difference 131.8 visitors, 95% CI (99.1, 164.5)
t = 7.92, p-value = 1.18e-14
```

## Explanation

### Steps 1–2: a 95% confidence interval

- From 36 random days: $\bar{x} = 1{,}276.6$, $s = 280.3$, $SE = 280.3/6 = 46.72$.
- $t^* = 2.030$ (35 df), margin of error $= 94.8$, interval **(1,181.7, 1,371.4)**. `stats.t.interval` gives the same answer.
- ==The true mean of all 731 days, 1,257.3, lies inside the interval.==

### Step 3: what "95%" means

Of 1,000 intervals from 1,000 different samples, 952 contained the true mean: 95.2%, as promised. About 1 interval in 20 misses, and we never know which one.

### Step 4: one-sample t-test

$H_0: \mu = 1300$ against $H_1: \mu \ne 1300$. $t = -0.50$, p-value $= 0.62$: **fail to reject $H_0$**. The sample is consistent with head office's claim. (Here we happen to know the truth is 1,257, so this is in fact a Type II error: a sample of 36 days is too small to detect a 43-visitor difference.)

### Step 5: display days, a borderline result

Display days averaged 35.4 more visitors, but $p = 0.055 > 0.05$: **fail to reject $H_0$**. ==Failing to reject is not proof of no effect.== The data card says displays do raise footfall a little; the effect is small relative to the day-to-day spread, so this test lacks the power to detect it. A longer trial would help.

### Step 6: discount days, a clear result

Discount days averaged 131.8 more visitors, 95% CI (99.1, 164.5), $p \approx 10^{-14}$: **reject $H_0$**. The interval also gives the size of the effect, which is what the manager needs. Caution: this is observational data. If discounts were given mostly on busy days, part of the difference may come from that, not from the discount itself.

## Try it

Do weekends have higher footfall than weekdays at S05 (ordinary days)? Run Welch's t-test and give a 95% CI for the difference.

Start from: `weekend = ordinary["day_of_week"].isin(["Saturday", "Sunday"])`

> [!answer]- Answer
> ```python
> weekend = ordinary["day_of_week"].isin(["Saturday", "Sunday"])
> we, wd = ordinary.loc[weekend, "footfall"], ordinary.loc[~weekend, "footfall"]
> res = stats.ttest_ind(we, wd, equal_var=False)
> ci = res.confidence_interval(0.95)
> print(f"Weekend mean {we.mean():.1f} (n = {len(we)}) | weekday mean {wd.mean():.1f} (n = {len(wd)})")
> print(f"Difference {we.mean() - wd.mean():.1f}, 95% CI ({ci.low:.1f}, {ci.high:.1f}), p-value = {res.pvalue:.2e}")
> ```
> ```output
> Weekend mean 1428.0 (n = 199) | weekday mean 1161.9 (n = 500)
> Difference 266.2, 95% CI (233.3, 299.0), p-value = 8.71e-43
> ```
> Weekends bring about 266 more visitors a day (95% CI 233 to 299): the largest effect in this practical, and overwhelmingly significant.

## Viva questions

1. Why did we use the t distribution rather than z for the interval in Step 2?
2. In Step 3, 952 of 1,000 intervals contained the true mean. Explain what this shows.
3. State H0 and H1 for Step 4. Why did we fail to reject H0 even though the true mean is not 1,300?
4. What is Welch's t-test, and why use `equal_var=False`?
5. The display test gave p = 0.055. What would you tell the store manager?
6. Why is a confidence interval for the difference more useful than the p-value alone?
7. Give one reason the discount effect in Step 6 might be overstated.

## Flashcards

SciPy: one-sample t-test? :: stats.ttest_1samp(sample, popmean=μ0)
SciPy: Welch two-sample t-test? :: stats.ttest_ind(a, b, equal_var=False)
SciPy: t-interval for a mean? :: stats.t.interval(0.95, df=n − 1, loc=x̄, scale=s/√n)
SciPy: CI for the difference from a t-test result? :: res.confidence_interval(0.95)
What does p = 0.055 at α = 0.05 mean? :: Fail to reject H0: the evidence is not quite strong enough

## Sources

- [SciPy documentation: scipy.stats.ttest_1samp, ttest_ind and t](https://docs.scipy.org/doc/scipy/reference/stats.html)
- Sahyadri Mart sales dataset: data card in `content/assets/data/sahyadri-mart-sales.md` (synthetic, this site)
