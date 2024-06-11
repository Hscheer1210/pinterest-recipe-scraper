import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { fileURLToPath } from 'url';
import Bottleneck from 'bottleneck';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Bottleneck setup
const limiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 200,
});

// Function to use OpenAI API to parse ingredients
const parseIngredients = limiter.wrap(async (markdown) => {
  try {
    console.log(`Calling OpenAI API for markdown content...`);
    
    // Call OpenAI API
    const response = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: `Extract the list of ingredients from the following markdown:\n\n${markdown}\n\nIngredients:`,
      max_tokens: 150,
      n: 1,
      stop: null,
      temperature: 0.5,
    });

    console.log(`Received response from OpenAI API for markdown content`);

    const ingredients = response.choices[0].text.trim().split('\n').map(ingredient => ingredient.trim());

    return ingredients;
  } catch (error) {
    console.error('Error using OpenAI API:', error);
    return "Failed to parse";
  }
});

const processMarkdown = async () => {
  try {
    console.log('Reading recipes from file...');
    const data = fs.readFileSync(path.join(__dirname, '../data', 'recipes_markdown.json'), 'utf8');
    const recipes = JSON.parse(data);

    console.log('Processing recipes...');
    const parsedRecipes = await Promise.all(recipes.map(async (recipe) => {
      console.log(`Processing recipe: ${recipe.url}`);
      const ingredients = await parseIngredients(recipe.markdown);
      console.log(`Parsed ingredients for recipe: ${recipe.url}`);
      return {
        url: recipe.url,
        ingredients: ingredients.length > 0 ? ingredients : "Failed to parse"
      };
    }));

    console.log('Writing parsed ingredients to file...');
    fs.writeFileSync(path.join(__dirname, '../data', 'recipes_ingredients.json'), JSON.stringify(parsedRecipes, null, 2), 'utf8');
    console.log('Parsed ingredients file saved successfully.');
  } catch (error) {
    console.error('Error processing markdown:', error);
  }
};

// Start processing the markdown recipes
processMarkdown();
