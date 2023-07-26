Feature: Cancel table booking

  Scenario: Cancel table booking
    Given an initiated booking for table "1" from "2023-01-01 12:00" to "2023-01-01 14:00"
    When booking is going to be cancelled
    Then booking status is updated to cancelled

  Scenario: Table booking is not found
    Given a non-existing booking for table "1" from "2023-01-01 12:00" to "2023-01-01 14:00"
    When booking is going to be cancelled
    Then booking status is not updated