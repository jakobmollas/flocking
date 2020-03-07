'use strict'

class Boid {
    constructor(x, y) {
        this.velocity = createVector(random(-1, 1), random(-1, 1));
        this.position = createVector(x, y);
        this.size = 3.0;
        this.maxSpeed = random(2, 7);
        this.maxSteeringForce = random(0.02, 0.40);
        this.repulsor = null;
    }

    setRepulsor(x, y) {
        this.repulsor = createVector(x, y);
    }

    clearRepulsor() {
        this.repulsor = null;
    }

    draw() {
        push();

        colorMode(HSB, 100);
        
        let normalizedHeading = (this.velocity.heading() + PI) / (2 * PI);
        let normalizedSpeed = this.velocity.mag() / this.maxSpeed;
        fill(100 * normalizedHeading, 50, 75 * normalizedSpeed);
        stroke(100 * normalizedHeading, 100, 100 * normalizedSpeed);

        // Draw a triangle rotated in the direction of velocity
        translate(this.position.x, this.position.y);
        rotate(this.velocity.heading() - HALF_PI);
        triangle(0, this.size * 2, this.size, -this.size * 2, -this.size, -this.size * 2); 
        
        pop();
    }

    update(qtBoids) {
        let alignment = this.align(qtBoids); 
        let separation = this.separate(qtBoids);
        let cohesion = this.cohesion(qtBoids);
        let repulsion = this.repulse();
        
        let acceleration = createVector();
        acceleration.add(alignment);
        acceleration.add(separation);
        acceleration.add(cohesion);
        acceleration.add(repulsion);

        this.velocity.add(acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);

        this.wraparoundIfNeeded();
    }

    wraparoundIfNeeded() {
        if (this.position.x < -this.size) 
            this.position.x = width + this.size;
        else if (this.position.x > width + this.size) 
            this.position.x = -this.size;
        
        if (this.position.y < -this.size) 
            this.position.y = height + this.size;
        else if (this.position.y > height + this.size) 
            this.position.y = -this.size;
    }

    repulse() {
        if (!this.repulsor)
            return createVector();

        let perceptionRadius = 200;

        let distanceToRepulsor = p5.Vector.dist(this.position, this.repulsor)
        if (distanceToRepulsor <= 0 || distanceToRepulsor > perceptionRadius) 
            return createVector();
            
        let repulsionForce = p5.Vector.sub(this.position, this.repulsor);
        repulsionForce.div(distanceToRepulsor); // Inversely scale with distance
        repulsionForce.mult(this.maxSpeed);
        repulsionForce.sub(this.velocity);
        repulsionForce.limit(0.7);

        return repulsionForce;
    }

    align(qtBoids) { 
        let perceptionRadius = 200;
        let reductionFactor = 4;
        let steeringInfluence = createVector();
        let count = 0;

        let matchedPoints = this.getReducedAreaMatch(qtBoids, perceptionRadius, reductionFactor);
        
        for (let point of matchedPoints) {
            let boid = point.userData;
            if (boid == this)
                continue;

            steeringInfluence.add(boid.velocity);
            count++;
        }

        let steering = createVector();

        if (count > 0) {
            // Calculate average
            steeringInfluence.div(count); 
            steeringInfluence.normalize();
            // Scale
            steeringInfluence.mult(this.maxSpeed);
            // Calculate delta
            steering = p5.Vector.sub(steeringInfluence, this.velocity);
            // Limit steering to a max value (do not steer to quickly)
            steering.limit(this.maxSteeringForce);

            return steering;
        }

        return steering;
    }

    // Method checks for nearby boids and steers away
    separate(qtBoids) {
        let perceptionRadius = 25.0;
        let reductionFactor = 4;
        let steeringInfluence = createVector(0, 0);
        let count = 0;

        let matchedPoints = this.getReducedAreaMatch(qtBoids, perceptionRadius, reductionFactor);

        for (let point of matchedPoints) {
            let boid = point.userData;
            if (boid == this)
                continue;

            let distance = p5.Vector.dist(this.position, boid.position);
            let diff = p5.Vector.sub(this.position, boid.position);
            diff.normalize();
            diff.div(distance); // Inversely scale with distance, farther away, less influence
            steeringInfluence.add(diff);
            count++;
        }

        if (count > 0) {
            steeringInfluence.div(count);

            // Reynolds: Steering = Desired - Velocity
            steeringInfluence.normalize();
            steeringInfluence.mult(this.maxSpeed);
            steeringInfluence.sub(this.velocity);
            steeringInfluence.limit(this.maxSteeringForce);
        }

        return steeringInfluence;
    }

    // For the average location (i.e. center) of all nearby boids, 
    // calculate steering vector towards us
    cohesion(qtBoids) {
        let perceptionRadius = 400;
        let reductionFactor = 4;
        let allLocations = createVector(0, 0);
        let count = 0;

        let matchedPoints = this.getReducedAreaMatch(qtBoids, perceptionRadius, reductionFactor);
        
        for (let point of matchedPoints) {
            let boid = point.userData;
            if (boid == this)
                continue;
            
            allLocations.add(boid.position);
            count++;
        }

        if (count > 0) {
            let averageLocation = allLocations.div(count);

            // A vector pointing from the average location to us
            let desired = p5.Vector.sub(averageLocation, this.position);
            desired.normalize();
            desired.mult(this.maxSpeed);

            // Steering = Desired minus Velocity
            let steering = p5.Vector.sub(desired, this.velocity);
            steering.limit(this.maxSteeringForce);

            return steering;
        }
        
        return createVector(0, 0);
    }

    getReducedAreaMatch(qtBoids, searchRadius, takeOneInEvery) {
        let searchArea = new CircleArea(this.position.x, this.position.y, searchRadius);
        let matchedPoints = qtBoids.query(searchArea);
        let reducedSet = matchedPoints.filter((n, i) => i % takeOneInEvery === 1);
        return reducedSet;
    }
}