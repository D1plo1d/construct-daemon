use serde::{Deserialize, Serialize};
use versioned_sled_model::VersionedSledModel;

mod package_r1;
pub use package_r1::Package;

mod part_r1;
pub use part_r1::Part;

mod task_r1;
pub use task_r1::{
    Task,
    Print,
    TaskContent,
    GCodeAnnotation,
};

mod task_status_r1;
pub use task_status_r1::TaskStatus;

#[derive(Debug, Serialize, Deserialize, VersionedSledModel)]
pub enum PackageDBEntry {
    R1 (package_r1::Package),
}

impl crate::models::VersionedModel for Package {
    type Entry = PackageDBEntry;
    const NAMESPACE: &'static str = "Package";

    fn get_id(&self) -> &async_graphql::ID {
        &self.id
    }
}

#[derive(Debug, Serialize, Deserialize, VersionedSledModel)]
pub enum PartDBEntry {
    R1 (part_r1::Part),
}

impl crate::models::VersionedModel for Part {
    type Entry = PartDBEntry;
    const NAMESPACE: &'static str = "Part";

    fn get_id(&self) -> &async_graphql::ID {
        &self.id
    }
}

#[derive(Debug, Serialize, Deserialize, VersionedSledModel)]
pub enum TaskDBEntry {
    R1 (task_r1::Task),
}

impl crate::models::VersionedModel for Task {
    type Entry = TaskDBEntry;
    const NAMESPACE: &'static str = "Task";

    fn get_id(&self) -> &async_graphql::ID {
        &self.id
    }
}
