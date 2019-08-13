import linuxcnc
import socket
import sys
import combinator_protobuf
import machine_protobuf
from time import sleep

MAX_COMBINATOR_MSG_SIZE = 16 * 1024

# Connect to LinuxCNC
cnc = linuxcnc.command()

# Create a unix domain socket to the localhost combinator
sock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)

# Connect the socket to the port where the server is listening
socket_address = "./uds_socket"
print >>sys.stderr, "connecting to %s" % socket_address

try:
    sock.connect(server_address)
except socket.error, msg:
    print >>sys.stderr, msg
    sys.exit(1)

taskHistoryEvents = []
task_state = None
current_file = None
newTaskHistoryEvents = []
lastMachineUpdate = 0

## TODO: Startup


# Main loop
while(true) {
    readable, writable, exceptional = select.select([socket], [socket], [socket])

    if (readable.len != 0) {
        # Only do a blocking read when a message is available
        interpretCombinatorMessage()
    }
    if (writable.len != 0 && lastMachineUpdate + 200 * 1000 < time.time()) {
        # Only create a machine update when an update can be sent over the
        # socket. Rate limited to one update every 200ms.
        createMachineUpdate()
    }
    if (exceptional.len != 0) {

    }
    if (readable.len == 0 && writable.len == 0) {
        # Wait 50ms and then check if there's anything to do again.
        sleep(0.05)
    }
}

interpretCombinatorMessage() {
    # Receive combinator messages
    msg = combinator_protobuf.CombinatorMessage()
    msg.ParseFromString(socket.recv(MAX_COMBINATOR_MSG_SIZE))
    type = msg.WhichOneof("payload")

    # Interpretter
    if (type == "new_connection") {
        # TODO: new connection process
    } elif (type == "set_config") {
        # This machine implementation does not load anything from the configuration
    } elif (type == "spool_task") {
        if (msg.spool_task.job) {
            # Start the print
            cnc.mode(linuxcnc.MODE_AUTO)
            cnc.wait_complete() # wait until mode switch executed
            cnc.program_open(msg.file_path)
            cnc.auto(linuxcnc.AUTO_RUN, 0)

            current_file = msg.spool_task.file_path

            # Update the task history
            # TODO: create a task history object here instead of a string
            newTaskHistoryEvents.push("JOB_START")
        } else {
            # Non-job task

            # THIS TODO SHOULD BE DELAYED UNTIL AFTER PROOF OF CONCEPT WITH A REAL INSTANCE OF LINUXCNC
            # TODO: what about if the spool task is setting a feedrate override during a print?
        }
    } elif (type == "estop") {
        cnc.estop()

        current_file = None
        # TODO: Update the task history
        newTaskHistoryEvents.push("JOB_CANCEL")
    } elif (type == "delete_task_history") {

    } else {
        print >>sys.stderr, "Unrecognized message type %s" % type
    }
}

createMachineUpdate() {
    # Feedback/Update from linuxCNC
    stat = None
    try:
        stat = linuxcnc.stat() # create a connection to the status channel
        s.poll() # get current values
    except linuxcnc.error, detail:
        print "error", detail
        sys.exit(1)

    msg = machine_protobuf.MachineMessage()
    feedback = msg.feedback.add()

    buildTaskUpdate(stat, feedback)
    buildMachineOperationUpdate(stat, feedback)

    lastMachineUpdate = time.time()
}

buildTaskUpdate(stat, feedback) {
    if (current_file != None) {
        if (stat.file != current_file) {
            print >>sys.stderr, 'Unexpected file change: %s' % stat.file
            sys.exit(1)
        }

        if (
            stat.exec_state == 'EXEC_ERROR'
            || cnc.stat.exec_state == 'EXEC_DONE'
        ) {
            # TODO: create a task history object here instead of a string
            newTaskHistoryEvents.push(
                cnc.stat.exec_state == 'EXEC_DONE'? "JOB_DONE" : "JOB_ERROR"
            )
            current_file = None
            cnc.reset_interpreter()
        } else {
            # Task is still running
            feedback.despooled_line_number = stat.current_line
        }
    }
    # TODO: Send machine messages
}

AXES = "xyzabcuvw"

buildMachineOperationUpdate(stat, msg) {
    # Axis positions
    for i in range(len(AXES)):
        axis = feedback.axis.add()
        axis.address = AXES[i]

        if (len(stat.position) > i) {
            axis.target_position = stat.position[i]
        }
        if (len(stat.actual_position) > i) {
            axis.actual_position = stat.actual_position[i]
        }
        if (len(stat.axis) > i) {
            axis.homed = stat.axis[i]['homed']
        }

    # Heaters not implemented

    # Spindle speed controller
    spindle = feedback.speed_controllers.add()
    spindle.id = 'spindle'
    spindle.target_speed = stat.spindle_speed
    spindle.enabled = stat.spindle_enabled
}
