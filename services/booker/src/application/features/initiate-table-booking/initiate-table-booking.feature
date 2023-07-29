Feature: Initiate table booking

  Scenario: Initiate booking
    Given a table with id "1" and a free time slot
    When I book this table
    Then booking should be initiated

  Scenario: Initiate booking for a table that is already booked
    Given a table with id "1" and a time slot that is already booked
    When I book this table
    Then booking should not be initiated

  Scenario: Initiate booking with a past time slot
    Given a table with id "1" and a past time slot
    When I book this table
    Then booking should not be initiated