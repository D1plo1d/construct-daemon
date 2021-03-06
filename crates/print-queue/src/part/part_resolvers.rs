use async_graphql::{
    ID,
    FieldResult,
    Context,
};
use eyre::{
    // eyre,
    Result,
    // Context as _,
};
use teg_machine::task::Task;
use teg_json_store::{ Record as _, JsonRow };

use crate::{
    part::Part,
};

#[async_graphql::Object]
impl Part {
    async fn id(&self) -> ID { (&self.id).into() }
    async fn name(&self) -> &String { &self.name }
    async fn quantity(&self) -> i32 { self.quantity }

    /// The number of prints running or paused. Specifically this counts the tasks with a status of
    /// spooled, started, or paused.
    async fn prints_in_progress<'ctx>(&self, ctx: &'ctx Context<'_>) -> FieldResult<i32> {
        let db: &crate::Db = ctx.data()?;

        Ok(Self::query_prints_in_progress(
            db,
            &self.id,
        false,
        ).await?)
    }

    /// The number of prints that have finished printing successfully.
    async fn prints_completed<'ctx>(&self, ctx: &'ctx Context<'_>) -> FieldResult<i32> {
        let db: &crate::Db = ctx.data()?;

        Ok(Self::query_prints_completed(db, &self.id).await?)
    }

    /// The quantity of this part times the quantity of it's containing package.
    async fn total_prints_<'ctx>(&self, ctx: &'ctx Context<'_>) -> FieldResult<i64> {
        let db: &crate::Db = ctx.data()?;

        Ok(Self::query_total_prints(db, &self.id).await?)
    }

    #[graphql(name="startedFinalPrint")]
    async fn started_final_print_<'ctx>(&self, ctx: &'ctx Context<'_>) -> FieldResult<bool> {
        let db: &crate::Db = ctx.data()?;

        async move {
            Result::<_>::Ok(Self::started_final_print(db, &self.id).await?)
        }
        // log the backtrace which is otherwise lost by FieldResult
        .await
        .map_err(|err| {
            warn!("{:?}", err);
            err.into()
        })
    }

    async fn tasks<'ctx>(&self, ctx: &'ctx Context<'_>) -> FieldResult<Vec<Task>> {
        let db: &crate::Db = ctx.data()?;

        let tasks = sqlx::query_as!(
            JsonRow,
            r#"
                SELECT props FROM tasks
                WHERE
                    part_id = ?
            "#,
            self.id,
        )
            .fetch_all(db)
            .await?;

        let tasks = Task::from_rows(tasks)?;
        Ok(tasks)
    }
}
