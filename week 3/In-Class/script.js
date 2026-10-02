// Exercise 1: Manipulating Variables and Data Types

let name = "Lucas";
let age = 25;
let hobbies = ["AAA", "BBB", "CCC","DDD","EEE"];

// Log the variables
console.log(name, age, hobbies);

// Add a new hobby
hobbies.push("drawing");
console.log(hobbies);

// Log one specific hobby using its index
console.log(hobbies[1]);

// Remove the last hobby
hobbies.pop();
console.log(hobbies);

// Extract part of the array
let selectedHobbies = hobbies.slice(0, 2);
console.log(selectedHobbies);

// Group everything into one object
let person = {
    name: name,
    age: age,
    hobbies: hobbies
};

// Add one to the person's age
person.age = person.age + 1;

console.log(person);

// Exercise 2: Creating and Using Functions

function calculateAgeInDays(age) {
    return age * 365;
}

console.log(calculateAgeInDays(25));
console.log(calculateAgeInDays(30));


// Arrow function version

const calculateAgeInDaysArrow = (age) => {
    return age * 365;
};

console.log(calculateAgeInDaysArrow(25));
console.log(calculateAgeInDaysArrow(30));

// Exercise 3: Demonstrating Scope

let globalVar = "I am global";

function testScope() {
    let localVar = "I am local";

    console.log(globalVar);
    console.log(localVar);
}

testScope();

// Uncomment this once to see the scope error,
// then comment it out again so Exercise 4 can run.

// console.log(localVar);

// Exercise 4: Loops and Conditionals

let numbers = [1, 2, 3, 4, 5, 6];

for (let i = 0; i < numbers.length; i++) {

    if (numbers[i] % 2 === 0) {
        console.log(numbers[i] + " is even");
    } else {
        console.log(numbers[i] + " is odd");
    }

}