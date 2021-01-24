use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use anyhow::{
    anyhow,
    Result,
    // Context as _,
};
use teg_json_store::{
    Record,
    JsonRow,
};
use teg_machine::task::Task;

use crate::part::Part;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Package {
    pub id: crate::DbId,
    pub version: i32,
    pub created_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
    // Foreign Keys
    pub print_queue_id: crate::DbId, // print queues have many (>=0) packages queued for printing
    // Props
    pub name: String,
    pub quantity: i32,
    // #[new(value = "true")]
    // pub delete_files_after_print: bool,
}

impl Package {
    // pub fn total_prints(&self, parts: &Vec<Part>) -> u64 {
    //     self.quantity * parts.iter().map(|part| part.quantity).sum::<u64>()
    // }

    pub async fn query_prints_completed<'e, 'c, E>(
        db: E,
        package_id: &crate::DbId,
    ) -> Result<i32>
    where
        E: 'e + sqlx::Executor<'c, Database = sqlx::Sqlite>,
    {
        let printed = sqlx::query!(
            r#"
                SELECT
                    COUNT(tasks.id) AS printed
                FROM tasks
                INNER JOIN parts ON parts.id = tasks.part_id
                WHERE
                    parts.package_id = ?
                    AND tasks.status = 'finished'
            "#,
            package_id,
        )
            .fetch_one(db)
            .await?
            .printed;

        Ok(printed)
    }

    pub async fn query_total_prints<'e, 'c, E>(
        db: E,
        package_id: &crate::DbId,
    ) -> Result<i64>
    where
        E: 'e + sqlx::Executor<'c, Database = sqlx::Sqlite>,
    {
        let total = sqlx::query!(
            r#"
                SELECT
                    CAST(parts.quantity * packages.quantity AS INT) AS total
                FROM parts
                INNER JOIN packages ON parts.package_id = packages.id
                WHERE packages.id = ?
                -- GROUP BY packages.id
            "#,
            package_id,
        )
            .fetch_one(db)
            .await?
            .total
            .ok_or_else(|| anyhow!("invalid part or package quantity"))?;

        Ok(total)
    }

    pub async fn is_done<'e, 'c, E>(
        db: E,
        package_id: &crate::DbId,
    ) -> Result<bool>
    where
        E: 'e + sqlx::Executor<'c, Database = sqlx::Sqlite> + Copy,
    {
        for part in Self::get_parts(db, package_id).await? {
            let is_done = Part::is_done(db, &part.id).await?;
            if !is_done {
                return Ok(false)
            }
        }

        Ok(true)
        //     let done = sqlx::query!(
        //         r#"
        //             SELECT
        //                 COUNT(tasks.id) AS printed,
        //                 CAST(parts.quantity * packages.quantity AS INT) AS total
        //             FROM parts
        //             LEFT JOIN tasks ON tasks.part_id = parts.id
        //             INNER JOIN packages ON parts.package_id = packages.id
        //             WHERE packages.id = ?
        //         "#,
        //         package_id,
        //     )
        //         .fetch_all(&mut db)
        //         .await?
        //         .into_iter()
        //         .every(|part_stats| part_stats.printed >= part_stats.total);

    //     Ok(done)
    }

    pub async fn get_parts<'e, 'c, E>(
        db: E,
        package_id: &crate::DbId,
    ) -> Result<Vec<Part>>
    where
        E: 'e + sqlx::Executor<'c, Database = sqlx::Sqlite>,
    {
        let parts = sqlx::query_as!(
            JsonRow,
            r#"
                SELECT props FROM parts
                WHERE
                    package_id = ?
            "#,
            package_id,
        )
            .fetch_all(db)
            .await?;

        let parts = Part::from_rows(parts)?;

        Ok(parts)
    }

    pub async fn get_tasks(db: &crate::Db, package_id: &crate::DbId) -> Result<Vec<Task>> {
        let tasks = sqlx::query_as!(
            JsonRow,
            r#"
                SELECT tasks.props FROM tasks
                INNER JOIN parts ON parts.id = tasks.part_id
                WHERE
                    parts.package_id = ?
            "#,
            package_id,
        )
            .fetch_all(db)
            .await?;

        let tasks = Task::from_rows(tasks)?;

        Ok(tasks)
    }
}

#[async_trait::async_trait]
impl Record for Package {
    const TABLE: &'static str = "packages";

    fn id(&self) -> &crate::DbId {
        &self.id
    }

    fn version(&self) -> teg_json_store::Version {
        self.version
    }

    fn version_mut(&mut self) -> &mut teg_json_store::Version {
        &mut self.version
    }


    async fn insert_no_rollback<'c>(
        &self,
        db: &mut sqlx::Transaction<'c, sqlx::Sqlite>,
    ) -> Result<()> {
        let json = serde_json::to_string(&self)?;

        sqlx::query!(
            r#"
                INSERT INTO packages
                (id, version, props, print_queue_id, quantity)
                VALUES (?, ?, ?, ?, ?)
            "#,
            self.id,
            self.version,
            json,
            self.print_queue_id,
            self.quantity,
        )
            .fetch_one(db)
            .await?;
        Ok(())
    }

    async fn update<'e, 'c, E>(
        &mut self,
        db: E,
    ) -> Result<()>
    where
        E: 'e + sqlx::Executor<'c, Database = sqlx::Sqlite>,
    {
        let (json, previous_version) = self.prep_for_update()?;

        sqlx::query!(
            r#"
                UPDATE packages
                SET
                    props=?,
                    version=?,
                    quantity=?
                WHERE
                    id=?
                    AND version=?
            "#,
            // SET
            json,
            self.version,
            self.quantity,
            // WHERE
            self.id,
            previous_version,
        )
            .fetch_one(db)
            .await?;

        Ok(())
    }
}