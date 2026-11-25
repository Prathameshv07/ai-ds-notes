"""Draw the two teaching figures for the note distribution-plots.

    python distribution-plots-figures.py

Writes distribution-plots-anatomy.png (a labelled box plot of S05's daily footfall from the
shared Sahyadri Mart dataset) and distribution-plots-shapes.png (four histogram shapes drawn
from seeded random numbers, for illustration only). Run from any folder.
"""

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

HERE = Path(__file__).parent
DATA = HERE.parent.parent / "data" / "sahyadri-mart-sales.csv"
BLUE, LIGHT, ORANGE, INK, MUTED = "#257de0", "#cfe2f8", "#f47230", "#191919", "#666666"
plt.rcParams.update({"axes.spines.top": False, "axes.spines.right": False, "font.size": 10})

# ---- Figure 1: anatomy of a box plot -------------------------------------------------
df = pd.read_csv(DATA)
f = df.loc[df["store_id"] == "S05", "footfall"]
q1, med, q3 = f.quantile([0.25, 0.5, 0.75])
iqr = q3 - q1
hi_fence = q3 + 1.5 * iqr
inside = f[(f >= q1 - 1.5 * iqr) & (f <= hi_fence)]

fig, ax = plt.subplots(figsize=(7, 5))
ax.boxplot(f, widths=0.35, patch_artist=True,
           boxprops=dict(facecolor=LIGHT, edgecolor=BLUE),
           medianprops=dict(color=ORANGE, linewidth=2.5),
           flierprops=dict(marker="o", markersize=5, markerfacecolor=BLUE, markeredgecolor="white"))
labels = [
    (f.max(), f"Outliers: beyond Q3 + 1.5 × IQR = {hi_fence:.0f}\n(15 busy days, mostly festivals)"),
    (inside.max(), f"Upper whisker end: {inside.max()}\n(busiest day inside the fence)"),
    (q3, f"Q3 = {q3:.0f} (75% of days below)"),
    (med, f"Median = {med:.0f}"),
    (q1, f"Q1 = {q1:.0f} (25% of days below)"),
    (inside.min(), f"Lower whisker end: {inside.min()}\n(quietest day; no low outliers)"),
]
for y, text in labels:
    ax.annotate(text, xy=(1.2, y), xytext=(1.45, y), va="center", fontsize=9.5, color=INK,
                arrowprops=dict(arrowstyle="-", color=MUTED, linewidth=0.8))
ax.annotate("", xy=(0.72, q1), xytext=(0.72, q3),
            arrowprops=dict(arrowstyle="<->", color=INK, linewidth=1))
ax.text(0.69, (q1 + q3) / 2, f"IQR = {iqr:.0f}\n(middle 50%)", ha="right", va="center", fontsize=9.5)
ax.set_xlim(0.3, 2.6)
ax.set_xticks([])
ax.spines["bottom"].set_visible(False)
ax.set_ylabel("Footfall (visitors per day)")
ax.set_title("Anatomy of a box plot: S05 Pune Express, daily footfall 2024-25")
fig.tight_layout()
fig.savefig(HERE / "distribution-plots-anatomy.png", dpi=110)
plt.close(fig)

# ---- Figure 2: four common shapes ----------------------------------------------------
rng = np.random.default_rng(2026)
shapes = {
    "Symmetric (bell-shaped)": rng.normal(50, 10, 3000),
    "Right-skewed (long right tail)": rng.gamma(2.0, 8.0, 3000) + 10,
    "Left-skewed (long left tail)": 100 - (rng.gamma(2.0, 8.0, 3000) + 10),
    "Bimodal (two humps)": np.concatenate([rng.normal(35, 6, 1800), rng.normal(70, 8, 1200)]),
}
fig, axes = plt.subplots(1, 4, figsize=(12, 2.9))
for ax, (name, x) in zip(axes, shapes.items()):
    ax.hist(x, bins=30, color=BLUE, edgecolor="white", linewidth=0.5)
    ax.axvline(np.mean(x), color=INK, linestyle="--", linewidth=1.3)
    ax.axvline(np.median(x), color=ORANGE, linewidth=2)
    ax.set_title(name, fontsize=10)
    ax.set_yticks([])
    ax.spines["left"].set_visible(False)
axes[0].plot([], [], color=INK, linestyle="--", label="Mean")
axes[0].plot([], [], color=ORANGE, linewidth=2, label="Median")
axes[0].legend(frameon=False, fontsize=9, loc="upper left")
fig.tight_layout()
fig.savefig(HERE / "distribution-plots-shapes.png", dpi=110)
plt.close(fig)
print("Wrote distribution-plots-anatomy.png and distribution-plots-shapes.png")
