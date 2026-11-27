---
id: data-engineer
title: Data Engineer
type: course
summary: Build the pipelines that move data reliably from apps into warehouses, lakes and models.
---
### What this job is

A data engineer builds and runs the pipelines that carry data from where it is created (orders, payments, app clicks) to where it is used (warehouses, dashboards, ML models). A typical day: fix a nightly job that failed, add a new source to the warehouse, model a table so analysts can query it easily, tune a slow Spark job, and check data-quality alerts. Most of the work is Python and SQL; Spark, Kafka, Airflow and the cloud come on top. In India, data engineers work at product companies and fintechs (Flipkart, Swiggy, Zomato, PhonePe, Razorpay), at IT services and data firms (TCS, Infosys, LTIMindtree, Tredence, Sigmoid), in banks, and in the global capability centres of multinationals. Entry roles: Data Engineer, ETL Developer, Big Data Engineer, SQL Developer, Analytics Engineer.

### Where am I?

Find your semester, see which stage your courses serve, and add the rest on your own.

**BSc Data Science**

| Sem | Your courses | Stage they serve | Add on your own |
|---|---|---|---|
| 1 | Python Programming, Descriptive Statistics, Office Tools for Data Management | Stage 1 Python | The Linux command line and Git |
| 2 | Advanced Python, Database Management System (with practicals), Linear Algebra | Stage 1 databases and SQL; Stage 2 pandas | Window functions; files and exceptions in Python |
| 3 | Data Warehousing & Mining (with practical), Design and Analysis of Algorithms | Stage 2 warehousing: ETL, OLAP, star and snowflake schemas | Airflow and dbt on a small dataset |
| 4 | Big Data Analytics (with practical), Introduction to Basic Statistics-II | Stage 3: Hadoop, Spark, streaming, NoSQL | Kafka; Docker |
| 5 | Data Engineering (with practical), Cloud Computing (with practical), Project Dissertation | Stage 2 lifecycle and ingestion; Stage 3 Spark SQL, Kafka, cloud | Data-quality tests; the batch ETL project |
| 6 | Data Security and Compliance, Project Implementation | Stage 3 governance; Stage 4 | Finish the projects |

**BSc IT**

| Sem | Your courses | Stage they serve | Add on your own |
|---|---|---|---|
| 1 | Database Management System (with practical), Operating System | Stage 1 databases and SQL; the OS course helps with Linux | The Linux command line and Git |
| 2 | MongoDB Practical, Web Programming Practical, Linear Algebra | A first look at NoSQL | Python basics now (the IT Python course comes in Sem 3) |
| 3 | Python Programming, Data Structures (with practicals) | Stage 1 Python | pandas; object-oriented Python |
| 4 | Core Java, Computer Networks (with practicals), Introduction to Basic Statistics-II | Networking helps with cloud and Kafka | Stage 2 pipelines and warehousing (not in the IT syllabus) |
| 5 | Business Intelligence, Project Dissertation | Stage 2 ideas: decision support, data preparation | Stage 3 Spark and Kafka (not in the IT syllabus) |
| 6 | Security in Computing, Project Implementation | Stage 3 security and governance | Cloud basics; finish the projects |

## Stage 1 · Foundations
*Why: every pipeline is Python plus SQL; both must be solid before the big tools make sense.*

**Python**
- [[python-basics]]
- [[python-control-flow]]
- [[python-functions]]
- [[python-collections]]
- [[python-files-and-errors]]
- [[python-oop]]
- [[python-modules-and-packages]]

**Tools**
- [[linux-command-line]]
- [[git-and-github]]

**Databases**
- [[what-is-dbms]]
- [[types-of-databases]]
- [[data-models]]
- [[er-model]]
- [[keys]]
- [[normalization]]
- [[acid-properties]]

**SQL**
- [[sql-basics]]
- [[sql-select-queries]]
- [[sql-aggregates]]
- [[sql-joins]]
- [[sql-subqueries]]
- [[sql-functions]]
- [[sql-window-functions]]

**Milestone:** You can write tested Python scripts that read and write files, design a normalised schema, and answer any question about it in SQL, including window functions.
**Free resources:** [The Python Tutorial](https://docs.python.org/3/tutorial/) · [SQLBolt](https://sqlbolt.com/) · [MIT: The Missing Semester (shell and Git)](https://missing.csail.mit.edu/)

## Stage 2 · Core
*Why: moving, storing and modelling data reliably, every day, is the job itself.*

**Pipelines**
- [[data-engineering-lifecycle]]
- [[file-formats]]
- [[python-apis-and-requests]]
- [[numpy-arrays]]
- [[pandas-dataframes]]
- [[pandas-merge]]

**Warehousing**
- [[data-warehouse]]
- [[etl-and-elt]]
- [[dimensional-modelling]]
- [[olap]]
- [[dbt-transformations]]
- [[indexing-and-query-optimization]]

**Running pipelines**
- [[workflow-orchestration]]
- [[data-quality-and-testing]]
- [[nosql-databases]]

**Milestone:** You can pull data from files and APIs, load it into a star-schema warehouse on a schedule with Airflow and dbt, and catch bad data before anyone else sees it.
**Free resources:** [DataTalksClub: Data Engineering Zoomcamp](https://github.com/DataTalksClub/data-engineering-zoomcamp) · [Kaggle Learn: Pandas](https://www.kaggle.com/learn/pandas) · [Apache Airflow documentation](https://airflow.apache.org/docs/)

## Stage 3 · Specialisation
*Why: scale and speed, for when data no longer fits one machine or must arrive in seconds.*

**Big data**
- [[big-data-and-hadoop]]
- [[apache-spark]]
- [[spark-dataframes-and-sql]]

**Streaming**
- [[batch-vs-stream-processing]]
- [[apache-kafka]]
- [[spark-structured-streaming]]

**Cloud and lakes**
- [[cloud-computing-basics]]
- [[docker-containers]]
- [[data-lakes-and-lakehouses]]
- [[cloud-data-platforms]]
- [[data-governance-and-security]]

**Data for machine learning**
- [[types-of-machine-learning]]
- [[ml-workflow]]
- [[ml-pipelines]]
- [[feature-stores]]

**Milestone:** You can process gigabytes with Spark, stream events through Kafka, run it all in containers on the cloud, and serve clean features to an ML team.
**Free resources:** [Apache Spark documentation](https://spark.apache.org/docs/latest/) · [Apache Kafka quickstart](https://kafka.apache.org/quickstart) · [DataTalksClub: Data Engineering Zoomcamp](https://github.com/DataTalksClub/data-engineering-zoomcamp)

## Stage 4 · Projects
*Why: interviewers hire on what you have built and can explain, not on certificates.*

- [[sql-business-questions-project]]
- [[batch-etl-pipeline-project]]
- [[spark-big-data-project]]
- [[streaming-pipeline-project]]

**Milestone:** Four pipeline projects on GitHub (SQL, batch, Spark, streaming), each with a diagram, a README and tests.
**Free resources:** [Open Government Data Platform India](https://data.gov.in/) · [NYC TLC Trip Record Data](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page)
