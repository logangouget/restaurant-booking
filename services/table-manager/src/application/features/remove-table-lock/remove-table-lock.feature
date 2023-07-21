Feature: Removing a table lock

  Scenario: Schedule a table lock removal
    Given a table with id "T1"
    And a lock is placed from "2023-10-10T21:00:00.000Z" to "2021-10-10T23:00:00.000Z"
    When I schedule a lock removal for the previous lock
    Then the table lock removal should be scheduled

  Scenario: Schedule a table lock removal when table doesn't exist
    Given a table with id "T1"
    And a lock is placed from "2023-10-10T21:00:00.000Z" to "2021-10-10T23:00:00.000Z"
    When I schedule a lock removal on a table with id "T2"
    Then the table lock removal should not be scheduled

  Scenario: Schedule a table lock removal when lock doesn't exist
    Given a table with id "T1"
    And a lock is not placed
    When I schedule a lock removal
    Then the table lock removal should not be scheduled

  Scenario: Remove table lock
    Given a table with id "T1"
    And a lock is placed from "2023-10-10T21:00:00.000Z" to "2021-10-10T23:00:00.000Z"
    When I remove the lock
    Then the table lock should be removed

  Scenario: Remove table lock when table doesn't exist
    Given a table with id "T1"
    And a lock is placed from "2023-10-10T21:00:00.000Z" to "2021-10-10T23:00:00.000Z"
    When I remove the lock on a table with id "T2"
    Then the table lock should not be removed