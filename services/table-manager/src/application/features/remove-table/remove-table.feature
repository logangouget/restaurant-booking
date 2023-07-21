Feature: Removing a table

    Scenario: Remove a table
        Given An existing table with the identifier "T1"
        When I remove a table with the identifier "T1"
        Then It should be removed to the list of tables

    Scenario: Giving a non-existing table
        When I remove a table with the identifier "T1"
        Then It should not be removed to the list of tables

    Scenario: Remove a locked table
        Given An existing table with the identifier "T1"
        And The table "T1" is locked
        When I remove a table with the identifier "T1"
        Then It should not be removed to the list of tables