// useState lets us store form data
import { useState } from "react" 
function Signup() {

    // store user inputs from form
    const [formData, setFormData] = useState ({
        username: "",
        email: "",
        password: "",
        account_type: "customer"
    })

    // storing aerror or success message
    const [message, setMessage] = useState ("")

    // Yodate formData when user types into field
    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]: e.target.value})
    }

    //
    const handleSubmit = async (e) => {

            // Send form data to Django backend
            const response = await fetch("http://localhost:8000/api/accounts/register/", {
                method: "POST", // We are sending data
                headers: { "Content-Type": "application/json" }, // Telling backend its JSON
                body: JSON.stringify(formData) // Convert form data to JSON
            })
            // account made success nice
            if(response.ok){
                setMessage("account made")
            }
            // error
            else{
                const data = await response.json()
                setMessage("Error" + JSON.stringify(data))
            }
        }
    
    
    return(
        <div>
            <h1>Create account</h1>
            <form onSubmit={handleSubmit} autocomplete="off"> 
                <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange}/>
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange}/>
                <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange}/>
                <select name="account_type" value={formData.account_type} onChange={handleChange}>
                    <option value="customer">Customer</option>
                    <option value="producer">Producer</option>
                </select>
                <button type="submit">Create Account</button>
            </form>
            {message && <p>{message}</p>}
        </div>

    )

}
export default Signup