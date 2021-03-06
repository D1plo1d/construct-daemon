use chrono::prelude::*;
use async_graphql::{
    ID,
    FieldResult,
};
use eyre::{
    eyre,
    Result,
    // Context as _,
};
use teg_json_store::{
    Record,
    JsonRow,
};
use teg_machine::{
    MachineMap,
    task::{
        Task,
        TaskStatus,
        Cancelled,
    },
    machine::messages::{
        StopMachine,
    },
};

use crate::{
    part::Part,
};

#[derive(Default)]
pub struct DeletePartsMutation;

#[derive(async_graphql::InputObject)]
struct DeletePartsInput {
    #[graphql(name="partIDs")]
    part_ids: Vec<ID>,
}

#[async_graphql::Object]
impl DeletePartsMutation {
    async fn delete_parts<'ctx>(
        &self,
        ctx: &'ctx async_graphql::Context<'_>,
        input: DeletePartsInput,
    ) -> FieldResult<Option<teg_common::Void>> {
        let db: &crate::Db = ctx.data()?;
        let machines: &MachineMap = ctx.data()?;
        let machines = machines.load();

        async move {
            let mut tx = db.begin().await?;

            let part_ids = input.part_ids
                .into_iter()
                .map(|id| id.0)
                .collect::<Vec<_>>();

            // Verify the parts exist
            let parts = Part::get_by_ids(
                &mut tx,
                &part_ids,
                false,
            ).await?;

            // Cancel all the tasks
            let tasks_sql = format!(
                r#"
                    SELECT tasks.props FROM tasks
                    INNER JOIN parts ON parts.id = tasks.part_id
                    WHERE
                        parts.id IN ({})
                        AND tasks.status IN ('spooled', 'started', 'paused')
                "#,
                part_ids.iter().map(|_| "?").collect::<Vec<_>>().join(", "),
            );
            let mut tasks_query = sqlx::query_as(
                &tasks_sql,
            );

            for id in part_ids {
                tasks_query = tasks_query.bind(id);
            }

            let tasks: Vec<JsonRow> = tasks_query
                .fetch_all(&mut tx)
                .await?;

            let mut tasks = Task::from_rows(tasks)?;

            for mut task in &mut tasks {
                task.status = TaskStatus::Cancelled(Cancelled {
                    cancelled_at: Utc::now(),
                });
                task.settle_task().await;
                task.update(&mut tx).await?;
            }

            // Soft delete the package
            let now= Utc::now();
            for mut part in parts {
                part.deleted_at = Some(now.clone());
                part.update(&mut tx).await?;
            }

            tx.commit().await?;

            // Stop any prints (including paused prints)
            for task in tasks {
                let machine = machines.get(&(&task.machine_id).into())
                    .ok_or_else(||
                        eyre!("machine (ID: {}) not found for package deletion", task.machine_id)
                    )?;

                machine.call(StopMachine).await?
            }

            Result::<_>::Ok(None)
        }
        // log the backtrace which is otherwise lost by FieldResult
        .await
        .map_err(|err| {
            warn!("{:?}", err);
            err.into()
        })
    }
}
