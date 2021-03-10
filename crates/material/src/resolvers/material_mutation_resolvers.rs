use chrono::prelude::*;
use async_graphql::{
    FieldResult,
    ID,
    Context,
};
use eyre::{
    Context as _,
    // eyre,
    // Result
};
// use teg_json_store::Record as _;

use teg_auth::AuthContext;
use teg_json_store::Record;
use crate::{FdmFilament, MaterialTypeGQL, material::{
        Material,
        MaterialConfigEnum,
    }};

// Input Types
// ---------------------------------------------

#[derive(async_graphql::InputObject)]
pub struct CreateMaterialInput {
    pub material_type: MaterialTypeGQL,
    pub model: async_graphql::Json<serde_json::Value>,
}

#[derive(async_graphql::InputObject)]
pub struct UpdateMaterialInput {
    #[graphql(name="materialID")]
    pub material_id: ID,
    pub model_version: i32,
    pub model: async_graphql::Json<serde_json::Value>,
}

#[derive(async_graphql::InputObject)]
pub struct DeleteMaterialInput {
    #[graphql(name="materialID")]
    pub material_id: ID,
}

// Resolvers
// ---------------------------------------------

#[derive(Default)]
pub struct MaterialMutation;

#[async_graphql::Object]
impl MaterialMutation {
    async fn create_material<'ctx>(
        &self,
        ctx: &'ctx Context<'_>,
        input: CreateMaterialInput,
    ) -> FieldResult<Material> {
        let db: &crate::Db = ctx.data()?;
        let auth: &AuthContext = ctx.data()?;

        auth.authorize_admins_only()?;

        let config = match input.material_type {
            MaterialTypeGQL::FdmFilament => {
                let config: FdmFilament = serde_json::from_value(input.model.0)?;
                MaterialConfigEnum::FdmFilament(Box::new(config))
            }
        };

        let material = Material {
            id: nanoid!(11),
            version: 0,
            created_at: Utc::now(),
            config,
        };

        material.insert(db).await?;

        Ok(material)
    }

    async fn update_material<'ctx>(
        &self,
        ctx: &'ctx Context<'_>,
        input: UpdateMaterialInput,
    ) -> FieldResult<Material> {
        let db: &crate::Db = ctx.data()?;
        let auth: &AuthContext = ctx.data()?;
        let material_hooks: &crate::MaterialHooksList = ctx.data()?;

        auth.authorize_admins_only()?;

        let mut material = Material::get_with_version(
            db,
            &input.material_id,
            input.model_version,
        ).await?;

        material.config = match material.config {
            MaterialConfigEnum::FdmFilament(_) => {
                let config: FdmFilament = serde_json::from_value(input.model.0)?;
                MaterialConfigEnum::FdmFilament(Box::new(config))
            }
        };

        material.update(db).await?;

        for hooks_provider in material_hooks.iter() {
            hooks_provider.after_update(
                &material.id
            ).await?;
        }

        Ok(material)
    }

    async fn delete_material<'ctx>(
        &self,
        ctx: &'ctx Context<'_>,
        input: DeleteMaterialInput
    ) -> FieldResult<Option<teg_common::Void>> {
        let db: &crate::Db = ctx.data()?;
        let auth: &AuthContext = ctx.data()?;

        auth.authorize_admins_only()?;

        let DeleteMaterialInput { material_id } = input;
        let material_id = material_id.to_string();

        Material::remove(db, &material_id)
            .await
            .with_context(|| "Error deleting material")?;

        Ok(None)
    }
}
