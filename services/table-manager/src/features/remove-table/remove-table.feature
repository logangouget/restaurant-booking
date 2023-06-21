Feature: Removing a table

    Scenario: Remove a table as a manager
        Given I am a manager
        Given An existing table with the identifier "T1"
        When I remove a table with the identifier "T1"
        Then It should be removed to the list of tables

    Scenario: Giving a non-existing table
        Given I am a manager
        When I remove a table with the identifier "T1"
        Then It should not be removed to the list of tables