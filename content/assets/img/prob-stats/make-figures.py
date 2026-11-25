"""Draws the static figures used by prob-stats theory notes.
Run from this folder: python make-figures.py   (needs numpy and matplotlib; seed fixed)."""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams.update({"font.size": 10, "axes.spines.top": False, "axes.spines.right": False})
BLUE, ORANGE, GREEN, GREY = "#2563eb", "#ea580c", "#16a34a", "#6b7280"


def skewness_shapes():
    x = np.linspace(0, 10, 2001)
    right = x * np.exp(-x)                         # gamma(2): mode 1, mean 2
    cdf = np.cumsum(right) / right.sum()
    med = x[np.searchsorted(cdf, 0.5)]
    fig, axes = plt.subplots(1, 3, figsize=(10, 3))
    panels = [
        ("Negative (left) skew", 10 - x, right, (10 - 2, 10 - med, 10 - 1)),
        ("Symmetric", x, np.exp(-(x - 5) ** 2 / 2), (5, 5, 5)),
        ("Positive (right) skew", x, right, (2, med, 1)),
    ]
    for ax, (title, xs, ys, (mean, median, mode)) in zip(axes, panels):
        ax.plot(xs, ys / ys.max(), color=BLUE, lw=2)
        ax.fill_between(xs, ys / ys.max(), color=BLUE, alpha=0.12)
        if mean == median == mode:
            ax.axvline(mean, color=GREY, ls="--")
            ax.text(mean, 1.05, "mean = median = mode", ha="center", fontsize=8)
        else:
            for v, lab, c in [(mode, "mode", GREEN), (median, "median", ORANGE), (mean, "mean", "black")]:
                ax.axvline(v, color=c, ls="--", lw=1.3, label=lab)
            ax.legend(frameon=False, fontsize=8, loc="upper left" if mean < mode else "upper right")
        ax.set_title(title, pad=18)
        ax.set_xlim(0, 10); ax.set_ylim(0, 1.15); ax.set_yticks([]); ax.set_xticks([])
    fig.tight_layout()
    fig.savefig("skewness-shapes.png", dpi=110)


def kurtosis_shapes():
    x = np.linspace(-4, 4, 1601)
    normal = np.exp(-x ** 2 / 2) / np.sqrt(2 * np.pi)
    b = 1 / np.sqrt(2)                            # Laplace with SD 1
    laplace = np.exp(-np.abs(x) / b) / (2 * b)
    a = np.sqrt(3)                                # uniform with SD 1
    uniform = np.where(np.abs(x) <= a, 1 / (2 * a), 0)
    fig, ax = plt.subplots(figsize=(6.5, 3.2))
    ax.plot(x, laplace, color=ORANGE, lw=2, label="Leptokurtic: peaked, heavy tails (β₂ > 3)")
    ax.plot(x, normal, color=BLUE, lw=2, label="Mesokurtic: normal (β₂ = 3)")
    ax.plot(x, uniform, color=GREEN, lw=2, label="Platykurtic: flat, light tails (β₂ < 3)")
    ax.set_yticks([]); ax.set_xlabel("All three curves have mean 0 and SD 1")
    ax.legend(frameon=False, fontsize=8, loc="upper right")
    fig.tight_layout()
    fig.savefig("kurtosis-shapes.png", dpi=110)


def scatter_patterns():
    rng = np.random.default_rng(2026)
    n = 80
    fig, axes = plt.subplots(2, 3, figsize=(9, 5.6))
    for ax, rho in zip(axes.flat[:5], [0.9, 0.5, 0.0, -0.5, -0.9]):
        x = rng.normal(size=n)
        y = rho * x + np.sqrt(1 - rho ** 2) * rng.normal(size=n)
        ax.scatter(x, y, s=12, color=BLUE, alpha=0.7)
        ax.set_title(f"r = {np.corrcoef(x, y)[0, 1]:.2f}")
    x = rng.uniform(-2, 2, n)
    y = x ** 2 + 0.3 * rng.normal(size=n)
    ax = axes.flat[5]
    ax.scatter(x, y, s=12, color=ORANGE, alpha=0.7)
    ax.set_title(f"U-shape: r = {np.corrcoef(x, y)[0, 1]:.2f}")
    for ax in axes.flat:
        ax.set_xticks([]); ax.set_yticks([])
    fig.tight_layout()
    fig.savefig("scatter-patterns.png", dpi=110)


skewness_shapes()
kurtosis_shapes()
scatter_patterns()
