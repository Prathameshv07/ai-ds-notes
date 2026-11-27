---
id: mlops-engineer
title: MLOps Engineer
type: course
summary: Automate, deploy and monitor ML systems so models keep working after launch.
---
### What this job is

An MLOps engineer keeps machine learning systems running after the data scientists hand them over. A typical week: automate the pipeline that retrains a fraud model every Sunday, version the data and models so any result can be traced back, set up alerts when a model's inputs start to drift, move a service into containers on the cloud, and keep cloud costs under control. The job sits between ML and DevOps, so Linux, Docker, CI/CD and the cloud matter as much as models. In India, MLOps engineers work at product companies with many models in production (Flipkart, Swiggy, PhonePe, Paytm), IT services and consulting firms (TCS, Infosys, Accenture, Thoughtworks), banks, and global capability centres. Entry roles: MLOps Engineer, ML Platform Engineer, DevOps or Cloud Engineer moving into ML; many freshers start in DevOps, cloud or data engineering.

### Where am I?

Find your semester, see which stage your courses serve, and add the rest on your own.

**BSc Data Science**

| Sem | Your courses | Stage they serve | Add on your own |
|---|---|---|---|
| 1 | Python Programming, Descriptive Statistics, Office Tools for Data Management | Stage 1 Python and statistics | The Linux command line and Git |
| 2 | Advanced Python, Database Management System, Linear Algebra | Stage 1 SQL | Testing and packaging Python |
| 3 | Data Warehousing & Mining, Design and Analysis of Algorithms | Stage 2 ML ideas | The ML workflow in scikit-learn |
| 4 | Big Data Analytics, Artificial Intelligence, Introduction to Basic Statistics-II | Stage 3 streaming ideas | Docker |
| 5 | Cloud Computing (with practical), Data Engineering (with practical), Project Dissertation | Stage 2 cloud, Docker and Kubernetes basics; Stage 3 pipelines | Experiment tracking and model versioning |
| 6 | Machine Intelligence (Machine Learning), Deep Learning, Data Security and Compliance, Project Implementation | Stage 2 models to deploy; Stage 3 governance | CI/CD and monitoring; the end-to-end project |

**BSc IT**

| Sem | Your courses | Stage they serve | Add on your own |
|---|---|---|---|
| 1 | Operating System, Database Management System, Software Engineering | Stage 1 SQL; the OS course helps with Linux; Agile habits | The Linux command line and Git |
| 2 | Web Programming Practical, MongoDB Practical, Linear Algebra | Web services basics | Python basics now (the IT Python course comes in Sem 3) |
| 3 | Python Programming, Data Structures, React & Node.js Practical | Stage 1 Python; building APIs | Testing; Docker |
| 4 | Computer Networks (with practical), Core Java, Introduction to Basic Statistics-II | Networking for cloud and serving | Stage 2 ML basics |
| 5 | Software Project Management, Advanced Web Programming, Business Intelligence | Planning and change-control habits | Cloud and Kubernetes (not in the IT syllabus) |
| 6 | Software Quality Assurance, Security in Computing, AI & ML (with practical) | Testing for CI/CD; security; models to deploy | Stage 3 monitoring; the projects |

## Stage 1 · Foundations
*Why: MLOps is mostly engineering; scripts, tests, Linux and Git are the tools you use every hour.*

**Python and tools**
- [[python-basics]]
- [[python-control-flow]]
- [[python-functions]]
- [[python-collections]]
- [[python-files-and-errors]]
- [[python-oop]]
- [[python-modules-and-packages]]
- [[python-testing]]
- [[python-apis-and-requests]]
- [[linux-command-line]]
- [[git-and-github]]

**Data**
- [[what-is-dbms]]
- [[types-of-databases]]
- [[data-models]]
- [[er-model]]
- [[keys]]
- [[sql-basics]]
- [[sql-select-queries]]
- [[sql-joins]]
- [[numpy-arrays]]
- [[pandas-dataframes]]

**Maths and statistics for ML**
- [[central-tendency]]
- [[dispersion]]
- [[probability-basics]]
- [[derivatives]]
- [[gradient-descent]]

**Milestone:** You can write tested Python tools, work comfortably in a Linux terminal, use Git with branches and pull requests, and query a database.
**Free resources:** [MIT: The Missing Semester (shell and Git)](https://missing.csail.mit.edu/) · [Pro Git book](https://git-scm.com/book/en/v2) · [The Python Tutorial](https://docs.python.org/3/tutorial/)

## Stage 2 · Core
*Why: you cannot run models you do not understand, or ship them without containers and the cloud.*

**Machine learning basics**
- [[types-of-machine-learning]]
- [[ml-workflow]]
- [[train-test-split]]
- [[bias-variance-tradeoff]]
- [[feature-scaling]]
- [[ml-linear-regression]]
- [[regression-metrics]]
- [[logistic-regression]]
- [[classification-metrics]]

**Containers and cloud**
- [[docker-containers]]
- [[cloud-computing-basics]]
- [[kubernetes-basics]]

**ML systems**
- [[ml-pipelines]]
- [[ml-experiment-tracking]]
- [[data-and-model-versioning]]
- [[model-deployment]]
- [[model-serving]]

**Milestone:** You can turn a notebook into a reproducible training pipeline, track and version its runs, and serve the model from a container on the cloud.
**Free resources:** [Docker: Get started](https://docs.docker.com/get-started/) · [Made With ML](https://madewithml.com/) · [Google Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course)

## Stage 3 · Specialisation
*Why: production is where models quietly break; automation and monitoring are what keep them honest.*

**Automation and monitoring**
- [[ci-cd-for-ml]]
- [[model-monitoring]]
- [[feature-stores]]

**Data pipelines**
- [[data-engineering-lifecycle]]
- [[data-warehouse]]
- [[dimensional-modelling]]
- [[etl-and-elt]]
- [[workflow-orchestration]]
- [[data-quality-and-testing]]
- [[batch-vs-stream-processing]]
- [[apache-kafka]]

**LLMs in production**
- [[large-language-models]]
- [[llm-deployment]]

**Governance**
- [[data-governance-and-security]]

**Milestone:** You can run an ML system end to end: data arrives through scheduled pipelines, models retrain and deploy through CI/CD, and drift triggers an alert before users notice.
**Free resources:** [DataTalksClub: MLOps Zoomcamp](https://github.com/DataTalksClub/mlops-zoomcamp) · [MLflow documentation](https://mlflow.org/docs/latest/) · [Kubernetes tutorials](https://kubernetes.io/docs/tutorials/)

## Stage 4 · Projects
*Why: interviewers hire on what you have built and can explain, not on certificates.*

- [[ml-api-deployment-project]]
- [[batch-etl-pipeline-project]]
- [[end-to-end-mlops-project]]

**Milestone:** Three projects on GitHub with working CI pipelines, container images and a short runbook explaining how to deploy, monitor and roll back.
**Free resources:** [GitHub Actions documentation](https://docs.github.com/en/actions) · [Hugging Face Datasets](https://huggingface.co/datasets)
