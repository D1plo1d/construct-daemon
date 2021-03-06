use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use eyre::{
  eyre,
  Result,
  // Context as _,
};

use crate::task::Task;

#[derive(Clone, Debug, PartialEq)]
pub enum MachineStatus {
    Disconnected,
    Connecting,
    Ready,
    Printing(Printing),
    Errored(Errored),
    Stopped,
}

#[derive(async_graphql::Enum, Debug, Copy, Clone, Eq, PartialEq)]
#[graphql(name = "MachineStatus")]
pub enum MachineStatusGQL {
    /// The machine is disconnected or turned off.
    Disconnected,
    /// The machine is being initialized.
    Connecting,
    /// The machine is connected and able to exececute gcodes and start prints.
    Ready,
    /// The machine is printing a job.
    Printing,
    /// The machine has encountered an error and automatically stopped the print. Send a reset
    /// mutation to change the status to \`CONNECTING\`.
    Errored,
    /// The machine was stopped by the user. Send a reset mutation to change the status to
    /// \`CONNECTING\`.
    Stopped,
}

impl From<MachineStatus> for MachineStatusGQL {
    fn from(status: MachineStatus) -> Self {
        match status {
          MachineStatus::Disconnected => MachineStatusGQL::Disconnected,
          MachineStatus::Connecting => MachineStatusGQL::Connecting,
          MachineStatus::Ready => MachineStatusGQL::Ready,
          MachineStatus::Printing(_) => MachineStatusGQL::Printing,
          MachineStatus::Errored(_) => MachineStatusGQL::Errored,
          MachineStatus::Stopped => MachineStatusGQL::Stopped,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Printing {
    pub task_id: crate::DbId,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Errored {
    pub errored_at: DateTime<Utc>,
    pub message: String,
}

impl Default for MachineStatus {
    fn default() -> Self { MachineStatus::Disconnected }
}

// impl MachineStatus {
//     pub fn was_successful(&self) -> bool {
//         self == &Self::Finished
//     }

//     pub fn was_aborted(&self) -> bool {
//         [
//             Self::Cancelled,
//             Self::Errored,
//         ].contains(self)
//     }
// }

impl MachineStatus {
    pub fn is_driver_ready(&self) -> bool {
      match self {
        Self::Ready | Self::Printing(_) => true,
        _ => false
      }
    }

    pub fn is_printing_task(&self, task_id: &crate::DbId) -> bool {
      if let MachineStatus::Printing(printing) = self {
        &printing.task_id == task_id
      } else {
        false
      }
    }

    pub fn is_printing(&self) -> bool {
      if let MachineStatus::Printing(_) = self {
        true
      } else {
        false
      }
    }

    pub fn is_stopped(&self) -> bool {
      self == &MachineStatus::Stopped
    }

    pub fn can_start_task(&self, task: &Task, is_automatic_print: bool) -> bool {
        match self {
            Self::Printing(_) if is_automatic_print || task.machine_override => {
              true
            }
            // Self::Printing(Printing { task_id }) if task_id == &task.id => {
            //   true
            // }
            Self::Ready => {
              true
            }
            _ => false
        }
    }

    pub fn verify_can_start(&self, task: &Task, is_automatic_print: bool) -> Result<()> {
      if !self.can_start_task(&task, is_automatic_print) {
          Err(eyre!("Cannot start task while machine is: {:?}", self))?;
      };
      Ok(())
    }
}
