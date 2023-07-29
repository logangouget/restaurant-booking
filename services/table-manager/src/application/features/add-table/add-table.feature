Feature: Adding a table

    Scenario: Adding a table
        When I add a table with the identifier "T1" and the number of seats "4"
        Then It should be added to the list of tables

    Scenario: Giving a non-unique identifier
        Given I have added a table with the identifier "T1"
        When I add a table with the identifier "T1" and the number of seats "4"
        Then It should not be added to the list of tables