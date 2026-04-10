# MJOLLNIR Staff & Operations Management

## 1) Database Schema

### staff
- id (pk, uuid/bigint)
- staff_id (varchar unique, format STF_XXXX)
- name (varchar, required)
- phone (varchar, required)
- email (varchar unique, required)
- role (enum: manager, driver)
- status (enum: active, inactive)
- assigned_business_type (varchar, nullable)
- assigned_organization_id (varchar, nullable)
- assigned_location_id (varchar, nullable)
- created_at (timestamp)
- updated_at (timestamp)

Indexes:
- unique(staff_id)
- unique(email)
- index(role, status)
- index(assigned_location_id)

### station_managers
- id (pk, uuid/bigint)
- station_id (fk -> stations.id)
- manager_id (fk -> staff.id)
- created_at (timestamp)

Constraints:
- unique(station_id, manager_id)
- manager_id must reference staff.role = manager

Indexes:
- index(station_id)
- index(manager_id)

### vehicle_drivers
- id (pk, uuid/bigint)
- vehicle_id (fk -> vehicles.id)
- driver_id (fk -> staff.id)
- assigned_at (timestamp)
- unassigned_at (timestamp nullable)

Constraints:
- unique(vehicle_id) where unassigned_at is null
- unique(driver_id) where unassigned_at is null
- driver_id must reference staff.role = driver

Indexes:
- index(vehicle_id)
- index(driver_id)

### vehicles update
- add driver_id nullable (fk -> staff.id)
- driver_id only valid for buggy/bus class vehicle types

## 2) API Endpoints

### Staff
- GET /api/staff?role=&status=&location_id=&search=
- POST /api/staff
- GET /api/staff/:id
- PATCH /api/staff/:id
- PATCH /api/staff/:id/status
- DELETE /api/staff/:id

### Station manager assignment
- GET /api/stations/:stationId/managers
- PUT /api/stations/:stationId/managers
  - body: { manager_ids: [staffId...] }
- POST /api/stations/:stationId/managers/:managerId
- DELETE /api/stations/:stationId/managers/:managerId

### Vehicle driver assignment
- GET /api/vehicles/:vehicleId/driver
- PUT /api/vehicles/:vehicleId/driver
  - body: { driver_id }
- DELETE /api/vehicles/:vehicleId/driver
- GET /api/drivers/:driverId/vehicle

### Dashboard views
- GET /api/ops/dashboard/manager-wise
- GET /api/ops/dashboard/driver-wise
- GET /api/ops/dashboard/station-wise
- GET /api/ops/dashboard/vehicle-wise

All dashboard endpoints accept filters:
- staff_id
- role
- station_id
- location_id
- vehicle_type

## 3) Admin Panel Flow

### Staff page (/staff)
- Add Staff form captures full staff record fields.
- Staff list supports edit, delete, activate/deactivate.
- Delete blocked when record is assigned in station_managers or vehicle_drivers.

### Station management
- Each station includes assign manager action.
- Multi-select manager assignment.
- Assigned managers visible in station table.

### Vehicle management
- Vehicle create/edit supports Assign Driver for driver-applicable types.
- Driver list only includes active drivers.
- One driver cannot be assigned to multiple vehicles.

## 4) Assignment Logic

- Only role=manager can be assigned to station.
- Only role=driver can be assigned to vehicle.
- Driver assignment is exclusive (one active vehicle per driver).
- Deleting assigned staff is blocked until reassignment.
- Reassignment updates current mapping atomically.

## 5) Dashboard Structure

### Manager-wise
- manager name
- assigned stations
- total vehicles under assigned station locations
- active rides
- issues (maintenance count)

### Driver-wise
- driver name
- assigned vehicle
- vehicle type
- current status (idle/on trip)
- trips completed

### Station-wise
- station name
- assigned managers
- total vehicles
- active rides
- available vehicles

### Vehicle-wise
- vehicle id
- type
- station/location
- assigned driver
- status

## Real-time update strategy

- Publish assignment and staff update events.
- Frontend subscribes and refreshes views from shared store.
- Backend should emit websocket/SSE events:
  - staff.updated
  - station.managers.updated
  - vehicle.driver.updated
  - vehicle.location.updated
