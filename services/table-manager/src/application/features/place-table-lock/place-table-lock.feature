Feature: Locking a table

  The table is locked when it is reserved for a period of time to avoid deletion or modification of the table while it is reserved

  Scenario: Locking a table
    Given a table with id "T1"
    When I lock the table with id "T1" from "2023-10-10T21:00:00.000Z" to "2021-10-10T23:00:00.000Z"
    Then the table with id "T1" should be locked from "2023-10-10T21:00:00.000Z" to "2021-10-10T23:00:00.000Z"

  Scenario: Locking a table that does not exist
    Given a table with id "T1"
    When I lock the table with id "T2" from "2023-10-10T21:00:00.000Z" to "2021-10-10T23:00:00.000Z"
    Then the table with id "T2" should not be locked

  Scenario: Locking a table that is already locked
    Given a table with id "T1" already locked from "2023-10-10T21:00:00.000Z" to "2021-10-10T23:00:00.000Z"
    When I lock the table with id "T1" from "2023-10-11T21:00:00.000Z" to "2021-10-11T23:00:00.000Z"
    Then the table with id "T1" should be locked with the new date
