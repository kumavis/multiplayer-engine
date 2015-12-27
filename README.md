
# generic low-latency multiplayer networking engine

### status: don't use this

roughly based on valve's source engine.

### network topology

primarily hub and spoke with an authoritative server.
optionally, clients can utilize a full mesh topology to decrease latency by optimistically accepting incomming user actions.

### consensys mechanism

clients apply optimistic updates, but the server delivers authoritative snapshots.

### state and actions

StateManager constructs a history with discrete steps.
Clients submit Actions performed after a frame, which are aggregated into an ActionFrame.
The state transitions by applying a single ActionFrame and arriving at a new state.
A client's Action may arrive late, so the history may be rewound and recalculated to include them.

A finalized history may look something like this:
```
stateAt 0 -> [ActionFrame] -> stateAt 1 -> [ActionFrame] -> stateAt 2
```

The history may have been recalculated like this:
```
stateAt 0
stateAt 0 -> [ActionFrame A] -> stateAt 1
stateAt 0 -> [ActionFrame A] -> stateAt 1 -> [ActionFrame B] -> stateAt 2
( ActionFrame A is replaced by ActionFrame C )
stateAt 0 -> [ActionFrame C] -> stateAt 1 -> [ActionFrame B] -> stateAt 2
```

### submitting actions

To keep latency low, clients send sliding windows of Actions over an unreliable channel.

The sliding windows look like this
```
send: [action1, ...action5]
send: [action2, ...action6]
send: [action3, ...action7]
```

actions from a user are deduped then added into the StateManger's history

