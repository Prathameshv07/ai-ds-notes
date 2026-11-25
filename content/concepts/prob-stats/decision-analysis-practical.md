---
id: decision-analysis-practical
title: Decision Tree for a Stock Order
subject: prob-stats
level: foundation
type: practical
practical: 5
syllabus: [UDSVI-006]
unit: 2
prerequisites: [decision-analysis, conditional-probability-practical]
related: [probability-basics]
time: 60 min
status: draft
sources:
  - "James R. Evans, Business Analytics, 3rd ed., Pearson, 2021, Ch. 16: Decision Analysis"
  - "Sahyadri Mart sales dataset: content/assets/data/sahyadri-mart-sales.md (synthetic, this site)"
---

## Aim

To develop a decision model for a business decision under uncertainty (how large a Diwali stock order to place) using payoff-table criteria, expected monetary value, EVPI and a decision tree, with probabilities estimated from the sales data.

## Concepts used

- [[decision-analysis]]: payoff tables, criteria, EMV, EOL, EVPI, decision trees.
- [[probability-basics]]: empirical probabilities from data.

## Setup (Colab)

[Open in Colab](https://colab.research.google.com/github/Prathameshv07/ai-ds-notes/blob/main/content/assets/notebooks/prob-stats/decision-analysis-practical.ipynb). Nothing to install.

- **Dataset:** Sahyadri Mart daily sales (synthetic; its data card in `content/assets/data/` lists every column). One row = one store on one day.
- The payoff table is the one from the [[decision-analysis]] note (profit in ₹ thousand); only the probabilities come from the data.
- The outputs below come from pandas 3.0 and NumPy 2.5; the notebook gives identical numbers on pandas 2.2 and NumPy 2.0 (current Colab).

## Code

### Step 1. Load the data: how much do festival days lift Supermarket sales above a normal day?

```python
# Step 1. Load the data: how much do festival days lift Supermarket sales above a normal day?
import numpy as np
import pandas as pd

url = ("https://raw.githubusercontent.com/Prathameshv07/ai-ds-notes/main/"
       "content/assets/data/sahyadri-mart-sales.csv")
df = pd.read_csv(url, parse_dates=["date"])
normal_day = df[df["is_festival"] == 0].groupby("store_id")["revenue_inr"].median()
fest = df[(df["is_festival"] == 1) & (df["store_type"] == "Supermarket")].copy()
fest["uplift"] = fest["revenue_inr"] / fest["store_id"].map(normal_day)
print(f"Supermarket festival days: {len(fest)}")
print(fest["uplift"].describe().round(2).to_string())
```

### Step 2. States of nature: Low (uplift below 1.3), Medium (1.3 to 1.7), High (1.7 or more)

```python
# Step 2. States of nature: Low (uplift below 1.3), Medium (1.3 to 1.7), High (1.7 or more)
fest["demand"] = pd.cut(fest["uplift"], bins=[0, 1.3, 1.7, np.inf], right=False, labels=["Low", "Medium", "High"])
prob = fest["demand"].value_counts(normalize=True).reindex(["High", "Medium", "Low"])
print(prob.round(3).to_string())
```

### Step 3. Payoff table (profit, Rs thousand) and the four criteria without probabilities

```python
# Step 3. Payoff table (profit, Rs thousand) and the four criteria without probabilities
pay = pd.DataFrame({"High": [200, 120, 60], "Medium": [80, 100, 60], "Low": [-60, 20, 40]},
                   index=["Large order", "Medium order", "Small order"])
regret = pay.max() - pay                         # best payoff in each state minus each payoff
crit = pd.DataFrame({"maximax": pay.max(axis=1), "maximin": pay.min(axis=1),
                     "Laplace": pay.mean(axis=1).round(1), "max regret": regret.max(axis=1)})
print(crit.to_string())
print("\nMaximax ->", crit["maximax"].idxmax(), "| Maximin ->", crit["maximin"].idxmax(),
      "| Laplace ->", crit["Laplace"].idxmax(), "| Minimax regret ->", crit["max regret"].idxmin())
```

### Step 4. With probabilities from the data: EMV, EOL and EVPI

```python
# Step 4. With probabilities from the data: EMV, EOL and EVPI
emv = (pay * prob).sum(axis=1)
eol = (regret * prob).sum(axis=1)
ev_perfect = (pay.max() * prob).sum()
print(pd.DataFrame({"EMV": emv.round(2), "EOL": eol.round(2)}).to_string())
print(f"\nBest by EMV: {emv.idxmax()} (EMV {emv.max():.2f})")
print(f"EV with perfect information {ev_perfect:.2f} -> EVPI = {ev_perfect - emv.max():.2f} (= min EOL {eol.min():.2f})")
```

### Step 5. The same decision as a tree, solved by rolling back

```python
# Step 5. The same decision as a tree, solved by rolling back
def rollback(node):
    """Return the expected value of a node and print the choice at each decision node."""
    if node["type"] == "end":
        return node["payoff"]
    if node["type"] == "chance":
        return sum(p * rollback(child) for p, child in node["branches"])
    values = {name: rollback(child) for name, child in node["options"].items()}
    best = max(values, key=values.get)
    print("Decision:", {k: round(float(v), 2) for k, v in values.items()}, "->", best)
    return values[best]

def chance(h, m, l):
    return {"type": "chance", "branches": [(prob["High"], {"type": "end", "payoff": h}),
                                           (prob["Medium"], {"type": "end", "payoff": m}),
                                           (prob["Low"], {"type": "end", "payoff": l})]}

tree = {"type": "decision", "options": {"Large": chance(200, 80, -60),
                                        "Medium": chance(120, 100, 20),
                                        "Small": chance(60, 60, 40)}}
print(f"Value of the tree: {rollback(tree):.2f}")
```

### Step 6. Sensitivity: how does the best order change with P(High)?

```python
# Step 6. Sensitivity: how does the best order change with P(High)?
import matplotlib.pyplot as plt

ph = np.linspace(0, 1, 101)
ratio = prob["Medium"] / (prob["Medium"] + prob["Low"])     # keep Medium:Low in the data's proportion
pm, pl = (1 - ph) * ratio, (1 - ph) * (1 - ratio)
curves = {name: row["High"] * ph + row["Medium"] * pm + row["Low"] * pl for name, row in pay.iterrows()}
fig, ax = plt.subplots(figsize=(7, 3.5))
for name, y in curves.items():
    ax.plot(ph, y, lw=2, label=name)
ax.axvline(prob["High"], color="grey", ls="--", lw=1, label="P(High) from data")
ax.set_xlabel("P(High demand)")
ax.set_ylabel("EMV (Rs thousand)")
ax.legend(fontsize=8)
plt.show()
cross = ph[np.argmax(curves["Large order"] > curves["Medium order"])]
print(f"Large overtakes Medium when P(High) exceeds about {cross:.2f}")
```

## Output

### Step 1

```output
Supermarket festival days: 160
count    160.00
mean       1.60
std        0.43
min        0.88
25%        1.28
50%        1.51
75%        1.88
max        3.13
```

### Step 2

```output
demand
High      0.331
Medium    0.400
Low       0.269
```

### Step 3

```output
              maximax  maximin  Laplace  max regret
Large order       200      -60     73.3         100
Medium order      120       20     80.0          80
Small order        60       40     53.3         140

Maximax -> Large order | Maximin -> Small order | Laplace -> Medium order | Minimax regret -> Medium order
```

### Step 4

```output
                EMV    EOL
Large order   82.12  34.88
Medium order  85.12  31.88
Small order   54.62  62.38

Best by EMV: Medium order (EMV 85.12)
EV with perfect information 117.00 -> EVPI = 31.88 (= min EOL 31.88)
```

### Step 5

```output
Decision: {'Large': 82.12, 'Medium': 85.12, 'Small': 54.62} -> Medium
Value of the tree: 85.12
```

### Step 6

![Line chart of EMV in rupees thousand against the probability of high demand, from 0 to 1. The large-order line rises steeply from about 23 to 200; the medium-order line rises gently from about 68 to 120; the small-order line is nearly flat around 52 to 60. A dashed line at 0.33, the data's estimate, sits just left of where the large and medium lines cross](../../assets/img/prob-stats/decision-analysis-practical-step6.png)

```output
Large overtakes Medium when P(High) exceeds about 0.36
```

## Explanation

### Steps 1–2: probabilities from data

- **Uplift** = festival-day revenue ÷ the same store's median ordinary-day revenue. On 160 Supermarket festival days it ranged from 0.88 to 3.13, with a median of 1.51.
- Cutting the uplift at 1.3 and 1.7 defines the states of nature, with ==probabilities 0.331 (High), 0.400 (Medium) and 0.269 (Low)==.
- These are empirical probabilities: past festivals stand in for the coming Diwali.

### Step 3: criteria without probabilities

The same four answers as the theory note: maximax → Large, maximin → Small, Laplace → Medium, minimax regret → Medium. `pay.max() - pay` computes the regret table in one line, because subtracting a row of column maxima works column by column.

### Step 4: EMV, EOL and EVPI

| Order | EMV (₹ thousand) | EOL |
|---|---|---|
| Large | 82.12 | 34.88 |
| Medium | 85.12 | 31.88 |
| Small | 54.62 | 62.38 |

==Medium has the highest EMV and the lowest EOL==, as theory says it must. EVPI = 117.00 − 85.12 = ₹31,880, equal to the minimum EOL: no demand forecast is worth more than that.

### Step 5: the decision tree

`rollback` works from the leaves back: a chance node returns the probability-weighted average of its branches; a decision node keeps its best option. ==The tree's value, 85.12, is the best EMV==, so the tree and the table agree. Trees become essential when decisions come in stages (for example, "survey first, then order").

### Step 6: sensitivity

Large overtakes Medium once $P(\text{High})$ exceeds about 0.36. The data's estimate, 0.33, is close to that line: the decision is **sensitive**. A small change in festival demand, or an estimate based on more years of data, could flip it. Report that, not just "order medium".

## Try it

The supplier offers a buy-back deal that cuts the large order's loss in low demand from −60 to −20 (₹ thousand). Recompute the EMVs. Does the best decision change?

Start from: `pay2 = pay.copy()` and change `pay2.loc["Large order", "Low"]`.

> [!answer]- Answer
> ```python
> pay2 = pay.copy()
> pay2.loc["Large order", "Low"] = -20
> emv2 = (pay2 * prob).sum(axis=1)
> print(emv2.round(2).to_string())
> print("Best by EMV:", emv2.idxmax())
> ```
> ```output
> Large order     92.88
> Medium order    85.12
> Small order     54.62
> Best by EMV: Large order
> ```
> With the buy-back, Large becomes the best choice by EMV: reducing the downside of the risky option can be worth more than better forecasts.

## Viva questions

1. What are the states of nature in this practical, and how were their probabilities estimated?
2. Why does `pay.max() - pay` give the regret table?
3. Why do the highest EMV and the lowest EOL always pick the same alternative?
4. Interpret EVPI = ₹31,880 for the store manager.
5. Explain how the `rollback` function solves a decision tree.
6. What does Step 6's sensitivity chart tell you about how confident to be in "order medium"?

## Flashcards

Expected monetary value of each row of a payoff table in pandas? :: (pay * prob).sum(axis=1)
Regret table in pandas? :: pay.max() - pay
EV with perfect information in pandas? :: (pay.max() * prob).sum()
How is a chance node valued when rolling back a tree? :: Probability-weighted average of its branches
How is a decision node valued when rolling back a tree? :: The value of its best branch

## Sources

- James R. Evans, Business Analytics, 3rd ed., Pearson, 2021, Ch. 16: Decision Analysis
- Sahyadri Mart sales dataset: data card in `content/assets/data/sahyadri-mart-sales.md` (synthetic, this site)
