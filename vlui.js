;(function() {
/*!
 * JSON3 with compact stringify -- Modified by Kanit Wongsuphasawat.   https://github.com/kanitw/json3
 *
 * Forked from JSON v3.3.2 | https://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org
 */
;(function () {
  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // A set of types used to distinguish objects from primitives.
  var objectTypes = {
    "function": true,
    "object": true
  };

  // Detect the `exports` object exposed by CommonJS implementations.
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  // Use the `global` object exposed by Node (including Browserify via
  // `insert-module-globals`), Narwhal, and Ringo as the default context,
  // and the `window` object in browsers. Rhino exports a `global` function
  // instead.
  var root = objectTypes[typeof window] && window || this,
      freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

  if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
    root = freeGlobal;
  }

  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object.
  function runInContext(context, exports) {
    context || (context = root["Object"]());
    exports || (exports = root["Object"]());

    // Native constructor aliases.
    var Number = context["Number"] || root["Number"],
        String = context["String"] || root["String"],
        Object = context["Object"] || root["Object"],
        Date = context["Date"] || root["Date"],
        SyntaxError = context["SyntaxError"] || root["SyntaxError"],
        TypeError = context["TypeError"] || root["TypeError"],
        Math = context["Math"] || root["Math"],
        nativeJSON = context["JSON"] || root["JSON"];

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var objectProto = Object.prototype,
        getClass = objectProto.toString,
        isProperty, forEach, undef;

    // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
    var isExtended = new Date(-3509827334573292);
    try {
      // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
      // results for certain dates in Opera >= 10.53.
      isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
        // Safari < 2.0.2 stores the internal millisecond time value correctly,
        // but clips the values returned by the date methods to the range of
        // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
        isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
    } catch (exception) {}

    // Internal: Determines whether the native `JSON.stringify` and `parse`
    // implementations are spec-compliant. Based on work by Ken Snyder.
    function has(name) {
      if (has[name] !== undef) {
        // Return cached feature test result.
        return has[name];
      }
      var isSupported;
      if (name == "bug-string-char-index") {
        // IE <= 7 doesn't support accessing string characters using square
        // bracket notation. IE 8 only supports this for primitives.
        isSupported = "a"[0] != "a";
      } else if (name == "json") {
        // Indicates whether both `JSON.stringify` and `JSON.parse` are
        // supported.
        isSupported = has("json-stringify") && has("json-parse");
      } else {
        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
        // Test `JSON.stringify`.
        if (name == "json-stringify") {
          var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
          if (stringifySupported) {
            // A test function object with a custom `toJSON` method.
            (value = function () {
              return 1;
            }).toJSON = value;
            try {
              stringifySupported =
                // Firefox 3.1b1 and b2 serialize string, number, and boolean
                // primitives as object literals.
                stringify(0) === "0" &&
                // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                // literals.
                stringify(new Number()) === "0" &&
                stringify(new String()) == '""' &&
                // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                // does not define a canonical JSON representation (this applies to
                // objects with `toJSON` properties as well, *unless* they are nested
                // within an object or array).
                stringify(getClass) === undef &&
                // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                // FF 3.1b3 pass this test.
                stringify(undef) === undef &&
                // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                // respectively, if the value is omitted entirely.
                stringify() === undef &&
                // FF 3.1b1, 2 throw an error if the given value is not a number,
                // string, array, object, Boolean, or `null` literal. This applies to
                // objects with custom `toJSON` methods as well, unless they are nested
                // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                // methods entirely.
                stringify(value) === "1" &&
                stringify([value]) == "[1]" &&
                // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                // `"[null]"`.
                stringify([undef]) == "[null]" &&
                // YUI 3.0.0b1 fails to serialize `null` literals.
                stringify(null) == "null" &&
                // FF 3.1b1, 2 halts serialization if an array contains a function:
                // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                // elides non-JSON values from objects and arrays, unless they
                // define custom `toJSON` methods.
                stringify([undef, getClass, null]) == "[null,null,null]" &&
                // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                // where character escape codes are expected (e.g., `\b` => `\u0008`).
                stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                stringify(null, value) === "1" &&
                stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                // serialize extended years.
                stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                // The milliseconds are optional in ES 5, but required in 5.1.
                stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                // four-digit years instead of six-digit years. Credits: @Yaffle.
                stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                // values less than 1000. Credits: @Yaffle.
                stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
            } catch (exception) {
              stringifySupported = false;
            }
          }
          isSupported = stringifySupported;
        }
        // Test `JSON.parse`.
        if (name == "json-parse") {
          var parse = exports.parse;
          if (typeof parse == "function") {
            try {
              // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
              // Conforming implementations should also coerce the initial argument to
              // a string prior to parsing.
              if (parse("0") === 0 && !parse(false)) {
                // Simple parsing test.
                value = parse(serialized);
                var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                if (parseSupported) {
                  try {
                    // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                    parseSupported = !parse('"\t"');
                  } catch (exception) {}
                  if (parseSupported) {
                    try {
                      // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                      // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                      // certain octal literals.
                      parseSupported = parse("01") !== 1;
                    } catch (exception) {}
                  }
                  if (parseSupported) {
                    try {
                      // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                      // points. These environments, along with FF 3.1b1 and 2,
                      // also allow trailing commas in JSON objects and arrays.
                      parseSupported = parse("1.") !== 1;
                    } catch (exception) {}
                  }
                }
              }
            } catch (exception) {
              parseSupported = false;
            }
          }
          isSupported = parseSupported;
        }
      }
      return has[name] = !!isSupported;
    }

    if (true) { // used to be !has("json")
      // Common `[[Class]]` name aliases.
      var functionClass = "[object Function]",
          dateClass = "[object Date]",
          numberClass = "[object Number]",
          stringClass = "[object String]",
          arrayClass = "[object Array]",
          booleanClass = "[object Boolean]";

      // Detect incomplete support for accessing string characters by index.
      var charIndexBuggy = has("bug-string-char-index");

      // Define additional utility methods if the `Date` methods are buggy.
      if (!isExtended) {
        var floor = Math.floor;
        // A mapping between the months of the year and the number of days between
        // January 1st and the first of the respective month.
        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        // Internal: Calculates the number of days between the Unix epoch and the
        // first day of the given month.
        var getDay = function (year, month) {
          return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
        };
      }

      // Internal: Determines if a property is a direct property of the given
      // object. Delegates to the native `Object#hasOwnProperty` method.
      if (!(isProperty = objectProto.hasOwnProperty)) {
        isProperty = function (property) {
          var members = {}, constructor;
          if ((members.__proto__ = null, members.__proto__ = {
            // The *proto* property cannot be set multiple times in recent
            // versions of Firefox and SeaMonkey.
            "toString": 1
          }, members).toString != getClass) {
            // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
            // supports the mutable *proto* property.
            isProperty = function (property) {
              // Capture and break the object's prototype chain (see section 8.6.2
              // of the ES 5.1 spec). The parenthesized expression prevents an
              // unsafe transformation by the Closure Compiler.
              var original = this.__proto__, result = property in (this.__proto__ = null, this);
              // Restore the original prototype chain.
              this.__proto__ = original;
              return result;
            };
          } else {
            // Capture a reference to the top-level `Object` constructor.
            constructor = members.constructor;
            // Use the `constructor` property to simulate `Object#hasOwnProperty` in
            // other environments.
            isProperty = function (property) {
              var parent = (this.constructor || constructor).prototype;
              return property in this && !(property in parent && this[property] === parent[property]);
            };
          }
          members = null;
          return isProperty.call(this, property);
        };
      }

      // Internal: Normalizes the `for...in` iteration algorithm across
      // environments. Each enumerated key is yielded to a `callback` function.
      forEach = function (object, callback) {
        var size = 0, Properties, members, property;

        // Tests for bugs in the current environment's `for...in` algorithm. The
        // `valueOf` property inherits the non-enumerable flag from
        // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
        (Properties = function () {
          this.valueOf = 0;
        }).prototype.valueOf = 0;

        // Iterate over a new instance of the `Properties` class.
        members = new Properties();
        for (property in members) {
          // Ignore all properties inherited from `Object.prototype`.
          if (isProperty.call(members, property)) {
            size++;
          }
        }
        Properties = members = null;

        // Normalize the iteration algorithm.
        if (!size) {
          // A list of non-enumerable properties inherited from `Object.prototype`.
          members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
          // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
          // properties.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, length;
            var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
            for (property in object) {
              // Gecko <= 1.0 enumerates the `prototype` property of functions under
              // certain conditions; IE does not.
              if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                callback(property);
              }
            }
            // Manually invoke the callback for each non-enumerable property.
            for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
          };
        } else if (size == 2) {
          // Safari <= 2.0.4 enumerates shadowed properties twice.
          forEach = function (object, callback) {
            // Create a set of iterated properties.
            var members = {}, isFunction = getClass.call(object) == functionClass, property;
            for (property in object) {
              // Store each property name to prevent double enumeration. The
              // `prototype` property of functions is not enumerated due to cross-
              // environment inconsistencies.
              if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                callback(property);
              }
            }
          };
        } else {
          // No bugs detected; use the standard `for...in` algorithm.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, isConstructor;
            for (property in object) {
              if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                callback(property);
              }
            }
            // Manually invoke the callback for the `constructor` property due to
            // cross-environment inconsistencies.
            if (isConstructor || isProperty.call(object, (property = "constructor"))) {
              callback(property);
            }
          };
        }
        return forEach(object, callback);
      };

      // Public: Serializes a JavaScript `value` as a JSON string. The optional
      // `filter` argument may specify either a function that alters how object and
      // array members are serialized, or an array of strings and numbers that
      // indicates which properties should be serialized. The optional `width`
      // argument may be either a string or number that specifies the indentation
      // level of the output.
      if (true) {
        // Internal: A map of control characters and their escaped equivalents.
        var Escapes = {
          92: "\\\\",
          34: '\\"',
          8: "\\b",
          12: "\\f",
          10: "\\n",
          13: "\\r",
          9: "\\t"
        };

        // Internal: Converts `value` into a zero-padded string such that its
        // length is at least equal to `width`. The `width` must be <= 6.
        var leadingZeroes = "000000";
        var toPaddedString = function (width, value) {
          // The `|| 0` expression is necessary to work around a bug in
          // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
          return (leadingZeroes + (value || 0)).slice(-width);
        };

        // Internal: Double-quotes a string `value`, replacing all ASCII control
        // characters (characters with code unit values between 0 and 31) with
        // their escaped equivalents. This is an implementation of the
        // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
        var unicodePrefix = "\\u00";
        var quote = function (value) {
          var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
          var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
          for (; index < length; index++) {
            var charCode = value.charCodeAt(index);
            // If the character is a control character, append its Unicode or
            // shorthand escape sequence; otherwise, append the character as-is.
            switch (charCode) {
              case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                result += Escapes[charCode];
                break;
              default:
                if (charCode < 32) {
                  result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                  break;
                }
                result += useCharIndex ? symbols[index] : value.charAt(index);
            }
          }
          return result + '"';
        };

        // Internal: Recursively serializes an object. Implements the
        // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
        var serialize = function (property, object, callback, properties, whitespace, indentation, stack, maxLineLength) {
          var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;

          maxLineLength = maxLineLength || 0;

          try {
            // Necessary for host object support.
            value = object[property];
          } catch (exception) {}
          if (typeof value == "object" && value) {
            className = getClass.call(value);
            if (className == dateClass && !isProperty.call(value, "toJSON")) {
              if (value > -1 / 0 && value < 1 / 0) {
                // Dates are serialized according to the `Date#toJSON` method
                // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                // for the ISO 8601 date time string format.
                if (getDay) {
                  // Manually compute the year, month, date, hours, minutes,
                  // seconds, and milliseconds if the `getUTC*` methods are
                  // buggy. Adapted from @Yaffle's `date-shim` project.
                  date = floor(value / 864e5);
                  for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                  for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                  date = 1 + date - getDay(year, month);
                  // The `time` value specifies the time within the day (see ES
                  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                  // to compute `A modulo B`, as the `%` operator does not
                  // correspond to the `modulo` operation for negative numbers.
                  time = (value % 864e5 + 864e5) % 864e5;
                  // The hours, minutes, seconds, and milliseconds are obtained by
                  // decomposing the time within the day. See section 15.9.1.10.
                  hours = floor(time / 36e5) % 24;
                  minutes = floor(time / 6e4) % 60;
                  seconds = floor(time / 1e3) % 60;
                  milliseconds = time % 1e3;
                } else {
                  year = value.getUTCFullYear();
                  month = value.getUTCMonth();
                  date = value.getUTCDate();
                  hours = value.getUTCHours();
                  minutes = value.getUTCMinutes();
                  seconds = value.getUTCSeconds();
                  milliseconds = value.getUTCMilliseconds();
                }
                // Serialize extended years correctly.
                value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                  "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                  // Months, dates, hours, minutes, and seconds should have two
                  // digits; milliseconds should have three.
                  "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                  // Milliseconds are optional in ES 5.0, but required in 5.1.
                  "." + toPaddedString(3, milliseconds) + "Z";
              } else {
                value = null;
              }
            } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
              // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
              // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
              // ignores all `toJSON` methods on these objects unless they are
              // defined directly on an instance.
              value = value.toJSON(property);
            }
          }
          if (callback) {
            // If a replacement function was provided, call it to obtain the value
            // for serialization.
            value = callback.call(object, property, value);
          }
          if (value === null) {
            return "null";
          }
          className = getClass.call(value);
          if (className == booleanClass) {
            // Booleans are represented literally.
            return "" + value;
          } else if (className == numberClass) {
            // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
            // `"null"`.
            return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
          } else if (className == stringClass) {
            // Strings are double-quoted and escaped.
            return quote("" + value);
          }
          // Recursively serialize objects and arrays.
          if (typeof value == "object") {
            // Check for cyclic structures. This is a linear search; performance
            // is inversely proportional to the number of unique nested objects.
            for (length = stack.length; length--;) {
              if (stack[length] === value) {
                // Cyclic structures cannot be serialized by `JSON.stringify`.
                throw TypeError();
              }
            }
            // Add the object to the stack of traversed objects.
            stack.push(value);
            results = [];
            // Save the current indentation level and indent one additional level.
            prefix = indentation;
            indentation += whitespace;
            if (className == arrayClass) {
              var totalLength = indentation.length, result;
              // Recursively serialize array elements.
              for (index = 0, length = value.length; index < length; index++) {
                element = serialize(index, value, callback, properties, whitespace, indentation,
                  stack, maxLineLength);
                result = element === undef ? "null" : element;
                totalLength += result.length + (index > 0 ? 1 : 0);
                results.push(result);
              }
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" :
                  "[" + results.join(",") + "]"
                )
                : "[]";
            } else {
              var totalLength = indentation.length, index=0;
              // Recursively serialize object members. Members are selected from
              // either a user-specified list of property names, or the object
              // itself.
              forEach(properties || value, function (property) {
                var result, element = serialize(property, value, callback, properties, whitespace, indentation,
                                        stack, maxLineLength);

                if (element !== undef) {
                  // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                  // is not the empty string, let `member` {quote(property) + ":"}
                  // be the concatenation of `member` and the `space` character."
                  // The "`space` character" refers to the literal space
                  // character, not the `space` {width} argument provided to
                  // `JSON.stringify`.
                  result = quote(property) + ":" + (whitespace ? " " : "") + element;
                  totalLength += result.length + (index++ > 0 ? 1 : 0);
                  results.push(result);
                }
              });
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" :
                  "{" + results.join(",") + "}"
                )
                : "{}";
            }
            // Remove the object from the traversed object stack.
            stack.pop();
            return result;
          }
        };

        // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.

        exports.stringify = function (source, filter, width, maxLineLength) {
          var whitespace, callback, properties, className;
          if (objectTypes[typeof filter] && filter) {
            if ((className = getClass.call(filter)) == functionClass) {
              callback = filter;
            } else if (className == arrayClass) {
              // Convert the property names array into a makeshift set.
              properties = {};
              for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
            }
          }
          if (width) {
            if ((className = getClass.call(width)) == numberClass) {
              // Convert the `width` to an integer and create a string containing
              // `width` number of space characters.
              if ((width -= width % 1) > 0) {
                for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
              }
            } else if (className == stringClass) {
              whitespace = width.length <= 10 ? width : width.slice(0, 10);
            }
          }
          // Opera <= 7.54u2 discards the values associated with empty string keys
          // (`""`) only if they are used directly within an object member list
          // (e.g., `!("" in { "": 1})`).
          return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", [], maxLineLength);
        };

        exports.compactStringify = function (source, filter, width){
          return exports.stringify(source, filter, width, 60);
        }
      }

      // Public: Parses a JSON source string.
      if (!has("json-parse")) {
        var fromCharCode = String.fromCharCode;

        // Internal: A map of escaped control characters and their unescaped
        // equivalents.
        var Unescapes = {
          92: "\\",
          34: '"',
          47: "/",
          98: "\b",
          116: "\t",
          110: "\n",
          102: "\f",
          114: "\r"
        };

        // Internal: Stores the parser state.
        var Index, Source;

        // Internal: Resets the parser state and throws a `SyntaxError`.
        var abort = function () {
          Index = Source = null;
          throw SyntaxError();
        };

        // Internal: Returns the next token, or `"$"` if the parser has reached
        // the end of the source string. A token may be a string, number, `null`
        // literal, or Boolean literal.
        var lex = function () {
          var source = Source, length = source.length, value, begin, position, isSigned, charCode;
          while (Index < length) {
            charCode = source.charCodeAt(Index);
            switch (charCode) {
              case 9: case 10: case 13: case 32:
                // Skip whitespace tokens, including tabs, carriage returns, line
                // feeds, and space characters.
                Index++;
                break;
              case 123: case 125: case 91: case 93: case 58: case 44:
                // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                // the current position.
                value = charIndexBuggy ? source.charAt(Index) : source[Index];
                Index++;
                return value;
              case 34:
                // `"` delimits a JSON string; advance to the next character and
                // begin parsing the string. String tokens are prefixed with the
                // sentinel `@` character to distinguish them from punctuators and
                // end-of-string tokens.
                for (value = "@", Index++; Index < length;) {
                  charCode = source.charCodeAt(Index);
                  if (charCode < 32) {
                    // Unescaped ASCII control characters (those with a code unit
                    // less than the space character) are not permitted.
                    abort();
                  } else if (charCode == 92) {
                    // A reverse solidus (`\`) marks the beginning of an escaped
                    // control character (including `"`, `\`, and `/`) or Unicode
                    // escape sequence.
                    charCode = source.charCodeAt(++Index);
                    switch (charCode) {
                      case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                        // Revive escaped control characters.
                        value += Unescapes[charCode];
                        Index++;
                        break;
                      case 117:
                        // `\u` marks the beginning of a Unicode escape sequence.
                        // Advance to the first character and validate the
                        // four-digit code point.
                        begin = ++Index;
                        for (position = Index + 4; Index < position; Index++) {
                          charCode = source.charCodeAt(Index);
                          // A valid sequence comprises four hexdigits (case-
                          // insensitive) that form a single hexadecimal value.
                          if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                            // Invalid Unicode escape sequence.
                            abort();
                          }
                        }
                        // Revive the escaped character.
                        value += fromCharCode("0x" + source.slice(begin, Index));
                        break;
                      default:
                        // Invalid escape sequence.
                        abort();
                    }
                  } else {
                    if (charCode == 34) {
                      // An unescaped double-quote character marks the end of the
                      // string.
                      break;
                    }
                    charCode = source.charCodeAt(Index);
                    begin = Index;
                    // Optimize for the common case where a string is valid.
                    while (charCode >= 32 && charCode != 92 && charCode != 34) {
                      charCode = source.charCodeAt(++Index);
                    }
                    // Append the string as-is.
                    value += source.slice(begin, Index);
                  }
                }
                if (source.charCodeAt(Index) == 34) {
                  // Advance to the next character and return the revived string.
                  Index++;
                  return value;
                }
                // Unterminated string.
                abort();
              default:
                // Parse numbers and literals.
                begin = Index;
                // Advance past the negative sign, if one is specified.
                if (charCode == 45) {
                  isSigned = true;
                  charCode = source.charCodeAt(++Index);
                }
                // Parse an integer or floating-point value.
                if (charCode >= 48 && charCode <= 57) {
                  // Leading zeroes are interpreted as octal literals.
                  if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                    // Illegal octal literal.
                    abort();
                  }
                  isSigned = false;
                  // Parse the integer component.
                  for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                  // Floats cannot contain a leading decimal point; however, this
                  // case is already accounted for by the parser.
                  if (source.charCodeAt(Index) == 46) {
                    position = ++Index;
                    // Parse the decimal component.
                    for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal trailing decimal.
                      abort();
                    }
                    Index = position;
                  }
                  // Parse exponents. The `e` denoting the exponent is
                  // case-insensitive.
                  charCode = source.charCodeAt(Index);
                  if (charCode == 101 || charCode == 69) {
                    charCode = source.charCodeAt(++Index);
                    // Skip past the sign following the exponent, if one is
                    // specified.
                    if (charCode == 43 || charCode == 45) {
                      Index++;
                    }
                    // Parse the exponential component.
                    for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal empty exponent.
                      abort();
                    }
                    Index = position;
                  }
                  // Coerce the parsed value to a JavaScript number.
                  return +source.slice(begin, Index);
                }
                // A negative sign may only precede numbers.
                if (isSigned) {
                  abort();
                }
                // `true`, `false`, and `null` literals.
                if (source.slice(Index, Index + 4) == "true") {
                  Index += 4;
                  return true;
                } else if (source.slice(Index, Index + 5) == "false") {
                  Index += 5;
                  return false;
                } else if (source.slice(Index, Index + 4) == "null") {
                  Index += 4;
                  return null;
                }
                // Unrecognized token.
                abort();
            }
          }
          // Return the sentinel `$` character if the parser has reached the end
          // of the source string.
          return "$";
        };

        // Internal: Parses a JSON `value` token.
        var get = function (value) {
          var results, hasMembers;
          if (value == "$") {
            // Unexpected end of input.
            abort();
          }
          if (typeof value == "string") {
            if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
              // Remove the sentinel `@` character.
              return value.slice(1);
            }
            // Parse object and array literals.
            if (value == "[") {
              // Parses a JSON array, returning a new JavaScript array.
              results = [];
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing square bracket marks the end of the array literal.
                if (value == "]") {
                  break;
                }
                // If the array literal contains elements, the current token
                // should be a comma separating the previous element from the
                // next.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "]") {
                      // Unexpected trailing `,` in array literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each array element.
                    abort();
                  }
                }
                // Elisions and leading commas are not permitted.
                if (value == ",") {
                  abort();
                }
                results.push(get(value));
              }
              return results;
            } else if (value == "{") {
              // Parses a JSON object, returning a new JavaScript object.
              results = {};
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing curly brace marks the end of the object literal.
                if (value == "}") {
                  break;
                }
                // If the object literal contains members, the current token
                // should be a comma separator.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "}") {
                      // Unexpected trailing `,` in object literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each object member.
                    abort();
                  }
                }
                // Leading commas are not permitted, object property names must be
                // double-quoted strings, and a `:` must separate each property
                // name and value.
                if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                  abort();
                }
                results[value.slice(1)] = get(lex());
              }
              return results;
            }
            // Unexpected token encountered.
            abort();
          }
          return value;
        };

        // Internal: Updates a traversed object member.
        var update = function (source, property, callback) {
          var element = walk(source, property, callback);
          if (element === undef) {
            delete source[property];
          } else {
            source[property] = element;
          }
        };

        // Internal: Recursively traverses a parsed JSON object, invoking the
        // `callback` function for each value. This is an implementation of the
        // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
        var walk = function (source, property, callback) {
          var value = source[property], length;
          if (typeof value == "object" && value) {
            // `forEach` can't be used to traverse an array in Opera <= 8.54
            // because its `Object#hasOwnProperty` implementation returns `false`
            // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            if (getClass.call(value) == arrayClass) {
              for (length = value.length; length--;) {
                update(value, length, callback);
              }
            } else {
              forEach(value, function (property) {
                update(value, property, callback);
              });
            }
          }
          return callback.call(source, property, value);
        };

        // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
        exports.parse = function (source, callback) {
          var result, value;
          Index = 0;
          Source = "" + source;
          result = get(lex());
          // If a JSON string contains multiple tokens, it is invalid.
          if (lex() != "$") {
            abort();
          }
          // Reset the parser state.
          Index = Source = null;
          return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
        };
      }
    }

    exports["runInContext"] = runInContext;
    return exports;
  }

  if (freeExports && !isLoader) {
    // Export for CommonJS environments.
    runInContext(root, freeExports);
  } else {
    // Export for web browsers and JavaScript engines.
    var nativeJSON = root.JSON,
        previousJSON = root["JSON3"],
        isRestored = false;

    var JSON3 = runInContext(root, (root["JSON3"] = {
      // Public: Restores the original value of the global `JSON` object and
      // returns a reference to the `JSON3` object.
      "noConflict": function () {
        if (!isRestored) {
          isRestored = true;
          root.JSON = nativeJSON;
          root["JSON3"] = previousJSON;
          nativeJSON = previousJSON = null;
        }
        return JSON3;
      }
    }));

    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);
}());

;(function() {
'use strict';
/* globals window, angular */

angular.module('vlui', [
    'LocalStorageModule',
    'angular-google-analytics'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('dl', window.dl)
  .constant('vl', window.vl)
  .constant('vg', window.vg)
  // other libraries
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // Use the customized vendor/json3-compactstringify
  .constant('JSON3', window.JSON3.noConflict())
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: true,
    defaultConfigSet: 'large',
    appId: 'vlui',
    // embedded polestar and voyager with known data
    embeddedData: window.vguiData || undefined,
    priority: {
      bookmark: 0,
      popup: 0,
      vislist: 1000
    },
    myriaRest: 'http://ec2-52-1-38-182.compute-1.amazonaws.com:8753',
    defaultTimeFn: 'year',
    typeNames: {
      nominal: 'text',
      ordinal: 'text-ordinal',
      quantitative: 'number',
      temporal: 'time',
      geographic: 'geo'
    }
  });
}());

;(function() {
angular.module("vlui").run(["$templateCache", function($templateCache) {$templateCache.put("alertmessages/alertmessages.html","<div class=\"alert-box\" ng-show=\"Alerts.alerts.length > 0\"><div class=\"alert-item\" ng-repeat=\"alert in Alerts.alerts\">{{ alert.msg }} <a class=\"close\" ng-click=\"Alerts.closeAlert($index)\">&times;</a></div></div>");
$templateCache.put("bookmarklist/bookmarklist.html","<modal id=\"bookmark-list\" ng-if=\"Bookmarks.isSupported\"><div class=\"modal-header card no-top-margin no-right-margin\"><modal-close-button on-close=\"logBookmarksClosed()\"></modal-close-button><h2 class=\"no-bottom-margin\">Bookmarks ({{ Bookmarks.length }})</h2><a ng-click=\"Bookmarks.clear()\"><i class=\"fa fa-trash-o\"></i> Clear all</a></div><div class=\"flex-grow-1 scroll-y\"><div ng-if=\"Bookmarks.length > 0\" class=\"hflex flex-wrap\"><vl-plot-group ng-repeat=\"chart in Bookmarks.dict | orderObjectBy : \'timeAdded\' : false\" class=\"wrapped-vl-plot-group card\" chart=\"chart\" field-set=\"chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug\" show-expand=\"false\" always-selected=\"true\" highlighted=\"highlighted\" overflow=\"true\" tooltip=\"true\" priority=\"consts.priority.bookmark\"></vl-plot-group></div><div class=\"vis-list-empty\" ng-if=\"Bookmarks.length === 0\">You have no bookmarks</div></div></modal>");
$templateCache.put("dataset/addmyriadataset.html","<div class=\"add-myria-dataset\"><p>Select a dataset from the Myria instance at <input ng-model=\"myriaRestUrl\"><button ng-click=\"loadDatasets(\'\')\">update</button>.</p><form ng-submit=\"addDataset(myriaDataset)\"><div><select name=\"myria-dataset\" id=\"select-myria-dataset\" ng-disabled=\"disabled\" ng-model=\"myriaDataset\" ng-options=\"optionName(dataset) for dataset in myriaDatasets track by dataset.relationName\"><option value=\"\">Select Dataset...</option></select></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/addurldataset.html","<div class=\"add-url-dataset\"><p>Add the name of the dataset and the URL to a <b>JSON</b> or <b>CSV</b> (with header) file. Make sure that the formatting is correct and clean the data before adding it. The added dataset is only visible to you.</p><form ng-submit=\"addFromUrl(addedDataset)\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input ng-model=\"addedDataset.name\" id=\"dataset-name\" type=\"text\"></div><div class=\"form-group\"><label for=\"dataset-url\">URL</label> <input ng-model=\"addedDataset.url\" id=\"dataset-url\" type=\"url\"><p>Make sure that you host the file on a server that has <code>Access-Control-Allow-Origin: *</code> set.</p></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/changeloadeddataset.html","<div class=\"change-loaded-dataset\"><div ng-if=\"userData.length\"><h3>Uploaded Datasets</h3><ul><li ng-repeat=\"dataset in userData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <span ng-if=\"dataset.description\">{{dataset.description}}</span> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong></li></ul></div><h3>Explore a Sample Dataset</h3><ul class=\"loaded-dataset-list\"><li ng-repeat=\"dataset in sampleData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong> <em ng-if=\"dataset.description\">{{dataset.description}}</em></li></ul></div>");
$templateCache.put("dataset/datasetmodal.html","<modal id=\"dataset-modal\" max-width=\"800px\"><div class=\"modal-header\"><modal-close-button></modal-close-button><h2>Add Dataset</h2></div><div class=\"modal-main\"><tabset><tab heading=\"Change Dataset\"><change-loaded-dataset></change-loaded-dataset></tab><tab heading=\"Paste or Upload Data\"><paste-dataset></paste-dataset></tab><tab heading=\"From URL\"><add-url-dataset></add-url-dataset></tab><tab heading=\"From Myria\"><add-myria-dataset></add-myria-dataset></tab></tabset></div></modal>");
$templateCache.put("dataset/datasetselector.html","<button id=\"select-data\" class=\"small-button select-data\" ng-click=\"loadDataset();\">Change</button>");
$templateCache.put("dataset/filedropzone.html","<div class=\"dropzone\" ng-transclude=\"\"></div>");
$templateCache.put("dataset/pastedataset.html","<div class=\"paste-data\"><file-dropzone dataset=\"dataset\" max-file-size=\"10\" valid-mime-types=\"[text/csv, text/json, text/tsv]\"><div class=\"upload-data\"><div class=\"form-group\"><label for=\"dataset-file\">File</label> <input type=\"file\" id=\"dataset-file\" accept=\"text/csv,text/tsv\"></div><p>Upload a CSV, or paste data in <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\">CSV</a> format into the fields.</p><div class=\"dropzone-target\"><p>Drop CSV file here</p></div></div><form ng-submit=\"addDataset()\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input type=\"name\" ng-model=\"dataset.name\" id=\"dataset-name\" required=\"\"></div><div class=\"form-group\"><textarea ng-model=\"dataset.data\" ng-model-options=\"{ updateOn: \'default blur\', debounce: { \'default\': 17, \'blur\': 0 }}\" required=\"\">\n      </textarea></div><button type=\"submit\">Add data</button></form></file-dropzone></div>");
$templateCache.put("fieldinfo/fieldinfo.html","<span class=\"field-info\"><span class=\"hflex full-width\" ng-click=\"clicked($event)\"><span class=\"type-caret\" ng-class=\"{active: !disableCountCaret || fieldDef.aggregate!==\'count\'}\"><i class=\"fa fa-caret-down\" ng-show=\"showCaret\"></i> <span class=\"type fa {{icon}}\" ng-show=\"showType\" title=\"{{typeNames[fieldDef.type]}}\"></span></span> <span ng-if=\"fieldDef.aggregate!==\'count\'\" class=\"field-info-text\"><span ng-if=\"func(fieldDef)\" class=\"field-func\" ng-class=\"{any: fieldDef._any}\">{{ func(fieldDef) }}</span><span class=\"field-name\" ng-class=\"{hasfunc: func(fieldDef), any: fieldDef._any}\">{{ fieldDef.field | underscore2space }}</span></span> <span ng-if=\"fieldDef.aggregate===\'count\'\" class=\"field-count field-info-text\"><span class=\"field-name\">COUNT</span></span> <span class=\"no-shrink remove\" ng-show=\"showRemove\"><a class=\"remove-field\" ng-click=\"removeAction()\"><i class=\"fa fa-times\"></i></a></span> <span class=\"no-shrink info\" ng-show=\"showInfo\"><i ng-if=\"fieldDef.aggregate !== \'count\' && containsType([vlType.NOMINAL, vlType.ORDINAL], fieldDef.type)\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min}}<br> <strong>Max:</strong> {{stats.max}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"fieldDef.aggregate !== \'count\' && fieldDef.type === vlType.TEMPORAL\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | date: short}}<br> <strong>Max:</strong> {{stats.max | date: short}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"fieldDef.aggregate !== \'count\' && fieldDef.type === vlType.QUANTITATIVE\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | number}}<br> <strong>Max:</strong> {{stats.max | number}}<br> <strong>Stdev:</strong> {{stats.stdev | number:2}}<br> <strong>Mean:</strong> {{stats.mean | number:2}}<br> <strong>Median:</strong> {{stats.median | number}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i><i ng-if=\"fieldDef.aggregate === \'count\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Count:</strong> {{stats.max}} </div>\" tooltip-side=\"right\"></i></span></span></span>");
$templateCache.put("modal/modal.html","<div class=\"modal\" ng-if=\"isOpen\"><div class=\"modal-wrapper\" style=\"{{wrapperStyle}}\" ng-transclude=\"\"></div></div>");
$templateCache.put("modal/modalclosebutton.html","<div class=\"right\"><a ng-click=\"closeModal()\" class=\"right\">Close</a></div>");
$templateCache.put("tabs/tab.html","<div ng-if=\"active\" ng-transclude=\"\"></div>");
$templateCache.put("tabs/tabset.html","<div class=\"tab-container\"><div><a class=\"tab\" ng-repeat=\"tab in tabset.tabs\" ng-class=\"{\'active\': tab.active}\" ng-click=\"tabset.showTab(tab)\">{{tab.heading}}</a></div><div class=\"tab-contents\" ng-transclude=\"\"></div></div>");
$templateCache.put("vlplot/vlplot.html","<div class=\"vl-plot\" id=\"vis-{{visId}}\" ng-class=\"{ fit: !alwaysScrollable && !overflow && (maxHeight && (!height || height <= maxHeight)) && (maxWidth && (!width || width <= maxWidth)), overflow: alwaysScrollable || overflow || (maxHeight && height && height > maxHeight) || (maxWidth && width && width > maxWidth), scroll: alwaysScrollable || unlocked || hoverFocus }\" ng-mousedown=\"unlocked=!thumbnail\" ng-mouseup=\"unlocked=false\" ng-mouseover=\"mouseover()\" ng-mouseout=\"mouseout()\"><div class=\"vis-tooltip\" ng-show=\"tooltipActive\"><table><tr ng-repeat=\"p in data\"><td class=\"key\">{{p[0]}}</td><td class=\"value\"><b>{{p[1]}}</b></td></tr></table></div></div>");
$templateCache.put("vlplotgroup/vlplotgroup.html","<div class=\"vl-plot-group vflex\"><div ng-show=\"showExpand || fieldSet || showTranspose || showBookmark && Bookmarks.isSupported || showToggle\" class=\"vl-plot-group-header no-shrink\"><div class=\"field-set-info\"><field-info ng-repeat=\"fieldDef in fieldSet\" ng-if=\"fieldSet\" field-def=\"fieldDef\" show-type=\"true\" ng-class=\"{ selected: alwaysSelected || (isSelected && isSelected(fieldDef.field)), unselected: isSelected && !isSelected(fieldDef.field), highlighted: (highlighted||{})[fieldDef.field] }\" ng-mouseover=\"(highlighted||{})[fieldDef.field] = true\" ng-mouseout=\"(highlighted||{})[fieldDef.field] = false\"></field-info></div><div class=\"toolbox\"><a ng-if=\"consts.debug && showDebug\" class=\"command debug\"><i class=\"fa fa-wrench\" ng-click=\"shCopied=\'\'; vlCopied=\'\'; vgCopied=\'\';\" ng-mouseover=\"initializePopup();\"></i></a><vl-plot-group-popup ng-if=\"consts.debug && showDebug && renderPopup\"></vl-plot-group-popup><a ng-if=\"showMark\" class=\"command disabled\"><i class=\"fa fa-font\"></i> <i class=\"fa fa-line-chart\"></i> <i class=\"fa fa-area-chart\"></i> <i class=\"fa fa-bar-chart\"></i> <i class=\"fa fa-circle-o\"></i></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'x\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'x\')\" ng-class=\"{active: log.active(chart.vlSpec, \'x\')}\"><i class=\"fa fa-long-arrow-right\"></i> <small>Log X</small></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'y\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'y\')\" ng-class=\"{active: log.active(chart.vlSpec, \'y\')}\"><i class=\"fa fa-long-arrow-up\"></i> <small>Log Y</small></a> <a ng-if=\"showSort && chart.vlSpec && toggleSort.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleSort.toggle(chart.vlSpec)\"><i class=\"fa sort\" ng-class=\"toggleSortClass(chart.vlSpec)\"></i> <small ng-if=\"showLabel\">Sort</small></a> <a ng-if=\"showFilterNull && chart.vlSpec && toggleFilterNull.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleFilterNull(chart.vlSpec)\" ng-class=\"{active: chart.vlSpec && chart.vlSpec.cfg.filterNull.O}\"><i class=\"fa fa-filter\"></i> <small ng-if=\"showLabel\">Filter</small> <small>NULL</small></a> <a ng-if=\"showTranspose\" class=\"command\" ng-click=\"transpose()\"><i class=\"fa fa-refresh transpose\"></i> <small ng-if=\"showLabel\">Swap X/Y</small></a> <a ng-if=\"showBookmark && Bookmarks.isSupported\" class=\"command\" ng-click=\"Bookmarks.toggle(chart)\" ng-class=\"{disabled: !chart.vlSpec.encoding, active: Bookmarks.isBookmarked(chart.shorthand)}\"><i class=\"fa fa-bookmark\"></i> <small ng-if=\"showLabel\">Bookmark</small></a> <a ng-if=\"showExpand\" ng-click=\"expandAction()\" class=\"command\"><i class=\"fa fa-expand\"></i></a></div></div><vl-plot class=\"flex-grow-1\" data-fieldset=\"{fieldSet.key}}\" chart=\"chart\" disabled=\"disabled\" is-in-list=\"isInList\" always-scrollable=\"alwaysScrollable\" config-set=\"{{configSet||\'small\'}}\" max-height=\"maxHeight\" max-width=\"maxWidth\" overflow=\"overflow\" priority=\"priority\" rescale=\"rescale\" thumbnail=\"thumbnail\" tooltip=\"tooltip\"></vl-plot></div>");
$templateCache.put("vlplotgroup/vlplotgrouppopup.html","<div class=\"drop-container\"><div class=\"popup-menu popup-command no-shrink dev-tool\"><div class=\"command debug\"><span class=\"debug\">Vls</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"shCopied=\'(Copied)\'\" zeroclip-model=\"chart.shorthand\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'VL shorthand\', chart.shorthand); shCopied=\'(Logged)\';\">Log</a> <span>{{shCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vl</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vlCopied=\'(Copied)\'\" zeroclip-model=\"chart.cleanSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega-Lite\', chart.cleanSpec); vlCopied=\'(Logged)\';\">Log</a> <span>{{vlCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vg</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vgCopied=\'(Copied)\'\" zeroclip-model=\"chart.vgSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega\', chart.vgSpec); vgCopied=\'(Logged)\';\">Log</a> <span>{{vgCopied}}</span></div><a class=\"command debug\" ng-href=\"{{ {type:\'vl\', spec: chart.cleanSpec} | reportUrl }}\" target=\"_blank\">Report Bad Render</a> <a ng-click=\"showFeature=!showFeature\" class=\"command debug\">{{chart.score}}</a><div ng-repeat=\"f in chart.scoreFeatures track by f.reason\">[{{f.score}}] {{f.reason}}</div></div></div>");}]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('alertMessages', ['Alerts', function(Alerts) {
    return {
      templateUrl: 'alertmessages/alertmessages.html',
      restrict: 'E',
      scope: {},
      link: function(scope /*, element, attrs*/) {
        scope.Alerts = Alerts;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Alerts', ['$timeout', '_', function($timeout, _) {
    var Alerts = {};

    Alerts.alerts = [];

    Alerts.add = function(msg, dismiss) {
      var message = {msg: msg};
      Alerts.alerts.push(message);
      if (dismiss) {
        $timeout(function() {
          var index = _.findIndex(Alerts.alerts, message);
          Alerts.closeAlert(index);
        }, dismiss);
      }
    };

    Alerts.closeAlert = function(index) {
      Alerts.alerts.splice(index, 1);
    };

    return Alerts;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', ['Bookmarks', 'consts', 'Logger', function (Bookmarks, consts, Logger) {
    return {
      templateUrl: 'bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        highlighted: '='
      },
      link: function postLink(scope /*, element, attrs*/) {
        // The bookmark list is designed to render within a modal overlay.
        // Because modal contents are hidden via ng-if, if this link function is
        // executing it is because the directive is being shown. Log the event:
        Logger.logInteraction(Logger.actions.BOOKMARK_OPEN);
        scope.logBookmarksClosed = function() {
          Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
        };

        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', ['_', 'vl', 'localStorageService', 'Logger', 'Dataset', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.dict = {};
      this.length = 0;
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.updateLength = function() {
      this.length = Object.keys(this.dict).length;
    };

    proto.save = function() {
      localStorageService.set('bookmarks', this.dict);
    };

    proto.load = function() {
      this.dict = localStorageService.get('bookmarks') || {};
      this.updateLength();
    };

    proto.clear = function() {
      this.dict = {};
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.toggle = function(chart) {
      var shorthand = chart.shorthand;

      if (this.dict[shorthand]) {
        this.remove(chart);
      } else {
        this.add(chart);
      }
    };

    proto.add = function(chart) {
      var shorthand = chart.shorthand;

      console.log('adding', chart.vlSpec, shorthand);

      chart.timeAdded = (new Date().getTime());

      chart.stats = Dataset.stats;

      this.dict[shorthand] = _.cloneDeep(chart);
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand);
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      console.log('removing', chart.vlSpec, shorthand);

      delete this.dict[shorthand];
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand);
    };

    proto.isBookmarked = function(shorthand) {
      return shorthand in this.dict;
    };

    return new Bookmarks();
  }]);
}());

;(function() {
'use strict';

// Service for the spec config.
// We keep this separate so that changes are kept even if the spec changes.
angular.module('vlui')
  .factory('Config', ['vl', '_', function(vl, _) {
    var Config = {};

    Config.schema = vl.schema.schema.properties.config;
    Config.dataschema = vl.schema.schema.properties.data;

    Config.data = vl.schema.util.instantiate(Config.dataschema);
    Config.config = vl.schema.util.instantiate(Config.schema);

    Config.getConfig = function() {
      return _.cloneDeep(Config.config);
    };

    Config.getData = function() {
      return Config.data;
    };

    Config.large = function() {
      return {
        singleWidth: 400,
        singleHeight: 400,
        largeBandMaxCardinality: 20
      };
    };

    Config.small = function() {
      return {};
    };

    Config.updateDataset = function(dataset, type) {
      if (dataset.values) {
        Config.data.values = dataset.values;
        delete Config.data.url;
        Config.data.formatType = undefined;
      } else {
        Config.data.url = dataset.url;
        delete Config.data.values;
        Config.data.formatType = type;
      }
    };

    return Config;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addMyriaDataset
 * @description
 * # addMyriaDataset
 */
angular.module('vlui')
  .directive('addMyriaDataset', ['$http', 'Dataset', 'consts', function ($http, Dataset, consts) {
    return {
      templateUrl: 'dataset/addmyriadataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.myriaRestUrl = consts.myriaRest;
        scope.myriaDatasets = [];
        scope.myriaDataset = null;

        scope.loadDatasets = function(query) {
          return $http.get(scope.myriaRestUrl + '/dataset/search/?q=' + query)
            .then(function(response) {
              scope.myriaDatasets = response.data;
            });
        };

        // Load the available datasets from Myria
        scope.loadDatasets('');

        scope.optionName = function(dataset) {
          return dataset.userName + ':' + dataset.programName + ':' + dataset.relationName;
        };

        scope.addDataset = function(myriaDataset) {
          var dataset = {
            group: 'myria',
            name: myriaDataset.relationName,
            url: scope.myriaRestUrl + '/dataset/user-' + myriaDataset.userName +
              '/program-' + myriaDataset.programName +
              '/relation-' + myriaDataset.relationName + '/data?format=json'
          };

          Dataset.type = 'json';
          Dataset.dataset = Dataset.add(dataset);
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addUrlDataset
 * @description
 * # addUrlDataset
 */
angular.module('vlui')
  .directive('addUrlDataset', ['Dataset', 'Logger', function (Dataset, Logger) {
    return {
      templateUrl: 'dataset/addurldataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // the dataset to add
        scope.addedDataset = {
          group: 'user'
        };

        scope.addFromUrl = function(dataset) {
          Logger.logInteraction(Logger.actions.DATASET_NEW_URL, dataset.url);

          // Register the new dataset
          Dataset.dataset = Dataset.add(dataset);

          // Fetch & activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:inGroup
 * @function
 * @description
 * # inGroup
 * Get datasets in a particular group
 * @param  {String} datasetGroup One of "sample," "user", or "myria"
 * @return {Array} An array of datasets in the specified group
 */
angular.module('vlui')
  .filter('inGroup', ['_', function(_) {
    return function(arr, datasetGroup) {
      return _.where(arr, {
        group: datasetGroup
      });
    };
  }]);

/**
 * @ngdoc directive
 * @name vlui.directive:changeLoadedDataset
 * @description
 * # changeLoadedDataset
 */
angular.module('vlui')
  .directive('changeLoadedDataset', ['Dataset', '_', function (Dataset, _) {
    return {
      templateUrl: 'dataset/changeloadeddataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Expose dataset object itself so current dataset can be marked
        scope.Dataset = Dataset;

        scope.userData = _.filter(Dataset.datasets, function(dataset) {
          return dataset.group !== 'sample';
        });

        scope.sampleData = _.where(Dataset.datasets, {
          group: 'sample'
        });

        scope.$watch(function() {
          return Dataset.datasets.length;
        }, function() {
          scope.userData = _.filter(Dataset.datasets, function(dataset) {
            return dataset.group !== 'sample';
          });
        });

        scope.selectDataset = function(dataset) {
          // Activate the selected dataset
          Dataset.update(dataset);
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

function getNameMap(dataschema) {
  return dataschema.reduce(function(m, fieldDef) {
    m[fieldDef.field] = fieldDef;
    return m;
  }, {});
}

angular.module('vlui')
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'dl', 'vl', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, dl, vl, SampleData, Config, Logger) {
    var Dataset = {};

    // Start with the list of sample datasets
    var datasets = SampleData;

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
    Dataset.dataschema = [];
    Dataset.dataschema.byName = {};
    Dataset.stats = {};
    Dataset.type = undefined;

    var typeOrder = {
      nominal: 0,
      ordinal: 0,
      geographic: 2,
      temporal: 3,
      quantitative: 4
    };

    Dataset.fieldOrderBy = {};

    Dataset.fieldOrderBy.type = function(fieldDef) {
      if (fieldDef.aggregate==='count') return 4;
      return typeOrder[fieldDef.type];
    };

    Dataset.fieldOrderBy.typeThenName = function(fieldDef) {
      return Dataset.fieldOrderBy.type(fieldDef) + '_' +
        (fieldDef.aggregate === 'count' ? '~' : fieldDef.field.toLowerCase());
        // ~ is the last character in ASCII
    };

    Dataset.fieldOrderBy.original = function() {
      return 0; // no swap will occur
    };

    Dataset.fieldOrderBy.field = function(fieldDef) {
      return fieldDef.field;
    };

    Dataset.fieldOrderBy.cardinality = function(fieldDef, stats) {
      return stats[fieldDef.field].distinct;
    };

    Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

    Dataset.getSchema = function(data, stats, order) {
      var types = dl.type.inferAll(data),
        schema = _.reduce(types, function(s, type, field) {
          var fieldDef = {
            field: field,
            type: vl.data.types[type],
            primitiveType: type
          };

          if (fieldDef.type === vl.type.QUANTITATIVE && stats[fieldDef.field].distinct <= 5) {
            fieldDef.type = vl.type.ORDINAL;
          }

          s.push(fieldDef);
          return s;
        }, []);

      schema = dl.stablesort(schema, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.field);

      schema.push(vl.fieldDef.count());
      return schema;
    };

    // update the schema and stats
    Dataset.onUpdate = [];

    Dataset.update = function(dataset) {
      var updatePromise;

      Logger.logInteraction(Logger.actions.DATASET_CHANGE, dataset.name);

      if (dataset.values) {
        updatePromise = $q(function(resolve, reject) {
          // jshint unused:false
          Dataset.type = undefined;
          Dataset.updateFromData(dataset, dataset.values);
          resolve();
        });
      } else {
        updatePromise = $http.get(dataset.url, {cache: true}).then(function(response) {
          var data;

          // first see whether the data is JSON, otherwise try to parse CSV
          if (_.isObject(response.data)) {
             data = response.data;
             Dataset.type = 'json';
          } else {
            data = dl.read(response.data, {type: 'csv'});
            Dataset.type = 'csv';
          }

          Dataset.updateFromData(dataset, data);
        });
      }

      Dataset.onUpdate.forEach(function(listener) {
        updatePromise = updatePromise.then(listener);
      });

      // Copy the dataset into the config service once it is ready
      updatePromise.then(function() {
        Config.updateDataset(dataset, Dataset.type);
      });

      return updatePromise;
    };

    Dataset.updateFromData = function(dataset, data) {
      Dataset.data = data;

      Dataset.currentDataset = dataset;
      Dataset.stats = dl.summary(data).reduce(function(s, profile) {
        s[profile.field] = profile;
        return s;
      }, {
        '*': {
          max: data.length,
          min: 0
        }
      });

      for (var fieldName in Dataset.stats) {
        if (fieldName !== '*') {
          Dataset.stats[fieldName].sample = _.sample(_.pluck(Dataset.data, fieldName), 7);
        }
      }

      Dataset.dataschema = Dataset.getSchema(Dataset.data, Dataset.stats);
      Dataset.dataschema.byName = getNameMap(Dataset.dataschema);
    };

    Dataset.add = function(dataset) {
      if (!dataset.id) {
        dataset.id = dataset.url;
      }
      datasets.push(dataset);

      return dataset;
    };

    return Dataset;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:datasetModal
 * @description
 * # datasetModal
 */
angular.module('vlui')
  .directive('datasetModal', function () {
    return {
      templateUrl: 'dataset/datasetmodal.html',
      restrict: 'E',
      scope: false
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('datasetSelector', ['Modals', 'Logger', function(Modals, Logger) {
    return {
      templateUrl: 'dataset/datasetselector.html',
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope/*, element, attrs*/) {
        scope.loadDataset = function() {
          Logger.logInteraction(Logger.actions.DATASET_OPEN);
          Modals.open('dataset-modal');
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fileDropzone
 * @description
 * # fileDropzone
 */
angular.module('vlui')
  // Add the file reader as a named dependency
  .constant('FileReader', window.FileReader)
  .directive('fileDropzone', ['Modals', 'Alerts', 'FileReader', function (Modals, Alerts, FileReader) {

    // Helper methods

    function isSizeValid(size, maxSize) {
      // Size is provided in bytes; maxSize is provided in megabytes
      // Coerce maxSize to a number in case it comes in as a string,
      // & return true when max file size was not specified, is empty,
      // or is sufficiently large
      return !maxSize || ( size / 1024 / 1024 < +maxSize );
    }

    function isTypeValid(type, validMimeTypes) {
        // If no mime type restrictions were provided, or the provided file's
        // type is whitelisted, type is valid
      return !validMimeTypes || ( validMimeTypes.indexOf(type) > -1 );
    }

    return {
      templateUrl: 'dataset/filedropzone.html',
      replace: true,
      restrict: 'E',
      // Permit arbitrary child content
      transclude: true,
      scope: {
        maxFileSize: '@',
        validMimeTypes: '@',
        // Expose this directive's dataset property to parent scopes through
        // two-way databinding
        dataset: '='
      },
      link: function (scope, element/*, attrs*/) {
        scope.dataset = scope.dataset || {};

        element.on('dragover dragenter', function onDragEnter(event) {
          if (event) {
            event.preventDefault();
          }
          event.originalEvent.dataTransfer.effectAllowed = 'copy';
        });

        function readFile(file) {
          if (!isTypeValid(file.type, scope.validMimeTypes)) {
            scope.$apply(function() {
              Alerts.add('Invalid file type. File must be one of following types: ' + scope.validMimeTypes);
            });
            return;
          }
          if (!isSizeValid(file.size, scope.maxFileSize)) {
            scope.$apply(function() {
              Alerts.add('File must be smaller than ' + scope.maxFileSize + ' MB');
            });
            return;
          }
          var reader = new FileReader();

          reader.onload = function(evt) {
            return scope.$apply(function(scope) {
              scope.dataset.data = evt.target.result;
              // Strip file name extensions from the uploaded data
              scope.dataset.name = file.name.replace(/\.\w+$/, '');
            });
          };

          reader.onerror = function() {
            Alerts.add('Error reading file');
          };

          reader.readAsText(file);
        }

        element.on('drop', function onDrop(event) {
          if (event) {
            event.preventDefault();
          }

          readFile(event.originalEvent.dataTransfer.files[0]);
        });

        element.find('input[type="file"]').on('change', function onUpload(/*event*/) {
          // "this" is the input element
          readFile(this.files[0]);
        });
      }

    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:pasteDataset
 * @description
 * # pasteDataset
 */
angular.module('vlui')
  .directive('pasteDataset', ['Dataset', 'Logger', 'Config', '_', 'dl', function (Dataset, Logger, Config, _, dl) {
    return {
      templateUrl: 'dataset/pastedataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.dataset = {
          name: '',
          data: ''
        };

        scope.addDataset = function() {
          var data = dl.read(scope.dataset.data, {
            type: 'csv'
          });

          var pastedDataset = {
            id: Date.now(),  // time as id
            name: scope.dataset.name,
            values: data,
            group: 'pasted'
          };

          // Log that we have pasted data
          Logger.logInteraction(Logger.actions.DATASET_NEW_PASTE, pastedDataset.name);

          // Register the pasted data as a new dataset
          Dataset.dataset = Dataset.add(pastedDataset);

          // Activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          // Close this directive's containing modal
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
angular.module('vlui').constant('SampleData', [{
  name: 'Barley',
  description: 'Barley yield by variety across the upper midwest in 1931 and 1932',
  url: 'data/barley.json',
  id: 'barley',
  group: 'sample'
},{
  name: 'Cars',
  description: 'Automotive statistics for a variety of car models between 1970 & 1982',
  url: 'data/cars.json',
  id: 'cars',
  group: 'sample'
},{
  name: 'Crimea',
  url: 'data/crimea.json',
  id: 'crimea',
  group: 'sample'
},{
  name: 'Driving',
  url: 'data/driving.json',
  id: 'driving',
  group: 'sample'
},{
  name: 'Iris',
  url: 'data/iris.json',
  id: 'iris',
  group: 'sample'
},{
  name: 'Jobs',
  url: 'data/jobs.json',
  id: 'jobs',
  group: 'sample'
},{
  name: 'Population',
  url: 'data/population.json',
  id: 'population',
  group: 'sample'
},{
  name: 'Movies',
  url: 'data/movies.json',
  id: 'movies',
  group: 'sample'
},{
  name: 'Birdstrikes',
  url: 'data/birdstrikes.json',
  id: 'birdstrikes',
  group: 'sample'
},{
  name: 'Burtin',
  url: 'data/burtin.json',
  id: 'burtin',
  group: 'sample'
},{
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26',
  group: 'sample'
}]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('fieldInfo', ['Dataset', 'Drop', 'vl', 'consts', '_', function (Dataset, Drop, vl, consts, _) {
    return {
      templateUrl: 'fieldinfo/fieldinfo.html',
      restrict: 'E',
      replace: true,
      scope: {
        fieldDef: '=',
        showType: '=',
        showInfo: '=',
        showCaret: '=',
        popupContent: '=',
        showRemove: '=',
        removeAction: '&',
        action: '&',
        disableCountCaret: '='
      },
      link: function(scope, element) {
        var funcsPopup;
        scope.vlType = vl.type;
        scope.typeNames = consts.typeNames;
        scope.stats = Dataset.stats[scope.fieldDef.field];
        scope.containsType = function(types, type) {
          return _.contains(types, type);
        };

        switch(scope.fieldDef.type){
          case vl.type.ORDINAL:
            scope.icon = 'fa-font';
            break;
          case vl.type.NOMINAL:
            scope.icon = 'fa-font';
            break;
          case vl.type.QUANTITATIVE:
            scope.icon = 'icon-hash';
            break;
          case vl.type.TEMPORAL:
            scope.icon = 'fa-calendar';
            break;
        }

        scope.clicked = function($event){
          if(scope.action && $event.target !== element.find('.fa-caret-down')[0] &&
            $event.target !== element.find('span.type')[0]) {
            scope.action($event);
          }
        };

        scope.func = function(fieldDef) {
          return fieldDef.aggregate || fieldDef.timeUnit ||
            (fieldDef.bin && 'bin') ||
            fieldDef._aggregate || fieldDef._timeUnit ||
            (fieldDef._bin && 'bin') || (fieldDef._any && 'auto');
        };

        scope.$watch('popupContent', function(popupContent) {
          if (!popupContent) { return; }

          if (funcsPopup) {
            funcsPopup.destroy();
          }

          funcsPopup = new Drop({
            content: popupContent,
            target: element.find('.type-caret')[0],
            position: 'bottom left',
            openOn: 'click'
          });
        });

        scope.$on('$destroy', function() {
          if (funcsPopup) {
            funcsPopup.destroy();
          }
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vega-lite-ui.logger
 * @description
 * # logger
 * Service in the vega-lite-ui.
 */
angular.module('vlui')
  .service('Logger', ['$location', '$window', 'consts', 'Analytics', function ($location, $window, consts, Analytics) {

    var service = {};

    service.levels = {
      OFF: {id:'OFF', rank:0},
      TRACE: {id:'TRACE', rank:1},
      DEBUG: {id:'DEBUG', rank:2},
      INFO: {id:'INFO', rank:3},
      WARN: {id:'WARN', rank:4},
      ERROR: {id:'ERROR', rank:5},
      FATAL: {id:'FATAL', rank:6}
    };

    service.actions = {
      // DATA
      INITIALIZE: {category: 'DATA', id: 'INITIALIZE', level: service.levels.DEBUG},
      UNDO: {category: 'DATA', id: 'UNDO', level: service.levels.INFO},
      REDO: {category: 'DATA', id: 'REDO', level: service.levels.INFO},
      DATASET_CHANGE: {category: 'DATA', id: 'DATASET_CHANGE', level: service.levels.INFO},
      DATASET_OPEN: {category: 'DATA', id: 'DATASET_OPEN', level: service.levels.INFO},
      DATASET_NEW_PASTE: {category: 'DATA', id: 'DATASET_NEW_PASTE', level: service.levels.INFO},
      DATASET_NEW_URL: {category: 'DATA', id: 'DATASET_NEW_URL', level: service.levels.INFO},
      // BOOKMARK
      BOOKMARK_ADD: {category: 'BOOKMARK', id:'BOOKMARK_ADD', level: service.levels.INFO},
      BOOKMARK_REMOVE: {category: 'BOOKMARK', id:'BOOKMARK_REMOVE', level: service.levels.INFO},
      BOOKMARK_OPEN: {category: 'BOOKMARK', id:'BOOKMARK_OPEN', level: service.levels.INFO},
      BOOKMARK_CLOSE: {category: 'BOOKMARK', id:'BOOKMARK_CLOSE', level: service.levels.INFO},
      BOOKMARK_CLEAR: {category: 'BOOKMARK', id: 'BOOKMARK_CLEAR', level: service.levels.INFO},
      // CHART
      CHART_MOUSEOVER: {category: 'CHART', id:'CHART_MOUSEOVER', level: service.levels.DEBUG},
      CHART_MOUSEOUT: {category: 'CHART', id:'CHART_MOUSEOUT', level: service.levels.DEBUG},
      CHART_RENDER: {category: 'CHART', id:'CHART_RENDER', level: service.levels.DEBUG},
      CHART_EXPOSE: {category: 'CHART', id:'CHART_EXPOSE', level: service.levels.DEBUG},
      CHART_TOOLTIP: {category: 'CHART', id:'CHART_TOOLTIP', level: service.levels.DEBUG},
      CHART_TOOLTIP_END: {category: 'CHART', id:'CHART_TOOLTIP_END', level: service.levels.DEBUG},

      SORT_TOGGLE: {category: 'CHART', id:'SORT_TOGGLE', level: service.levels.INFO},
      MARK_TOGGLE: {category: 'CHART', id:'MARK_TOGGLE', level: service.levels.INFO},
      DRILL_DOWN_OPEN: {category: 'CHART', id:'DRILL_DOWN_OPEN', level: service.levels.INFO},
      DRILL_DOWN_CLOSE: {category: 'CHART', id: 'DRILL_DOWN_CLOSE', level: service.levels.INFO},
      LOG_TOGGLE: {category: 'CHART', id: 'LOG_TOGGLE', level: service.levels.INFO},
      TRANSPOSE_TOGGLE: {category: 'CHART', id: 'TRANSPOSE_TOGGLE', level: service.levels.INFO},
      NULL_FILTER_TOGGLE: {category: 'CHART', id:'NULL_FILTER_TOGGLE', level: service.levels.INFO},

      CLUSTER_SELECT: {category: 'CHART', id:'CLUSTER_SELECT', level: service.levels.INFO},
      LOAD_MORE: {category: 'CHART', id:'LOAD_MORE', level: service.levels.INFO},

      // FIELDS
      FIELDS_CHANGE: {category: 'FIELDS', id: 'FIELDS_CHANGE', level: service.levels.INFO},
      FIELDS_RESET: {category: 'FIELDS', id: 'FIELDS_RESET', level: service.levels.INFO},
      FUNC_CHANGE: {category: 'FIELDS', id: 'FUNC_CHANGE', level: service.levels.INFO},

      //POLESTAR
      SPEC_CHANGE: {category:'POLESTAR', id: 'SPEC_CHANGE', level: service.levels.DEBUG},
      FIELD_DROP: {category: 'POLESTAR', id: 'FIELD_DROP', level: service.levels.DEBUG},
      MARK_CHANGE: {category: 'POLESTAR', id: 'MARK_CHANGE', level: service.levels.DEBUG}
    };

    service.logInteraction = function(action, label, data) {
      if (!consts.logging) {
        return;
      }
      var value = data ? data.value : undefined;
      if(action.level.rank >= service.levels.INFO.rank) {
        Analytics.trackEvent(action.category, action.id, label, value);
        console.log('[Logging] ', action.id, label, data);
      }
    };

    service.logInteraction(service.actions.INITIALIZE, consts.appId);

    return service;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modal
 * @description
 * # modal
 */
angular.module('vlui')
  .directive('modal', ['$document', 'Modals', function ($document, Modals) {
    return {
      templateUrl: 'modal/modal.html',
      restrict: 'E',
      transclude: true,
      scope: {
        autoOpen: '=',
        maxWidth: '@'
      },
      // Provide an interface for child directives to close this modal
      controller: ['$scope', function($scope) {
        this.close = function() {
          $scope.isOpen = false;
        };
      }],
      link: function(scope, element, attrs) {
        var modalId = attrs.id;

        if (scope.maxWidth) {
          scope.wrapperStyle = 'max-width:' + scope.maxWidth;
        }

        // Default to closed unless autoOpen is set
        scope.isOpen = scope.autoOpen;

        // close on esc
        function escape(e) {
          if (e.keyCode === 27 && scope.isOpen) {
            scope.isOpen = false;
            scope.$digest();
          }
        }

        angular.element($document).on('keydown', escape);

        // Register this modal with the service
        Modals.register(modalId, scope);
        scope.$on('$destroy', function() {
          Modals.deregister(modalId);
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modalCloseButton
 * @description
 * # modalCloseButton
 */
angular.module('vlui')
  .directive('modalCloseButton', function() {
    return {
      templateUrl: 'modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        'closeCallback': '&onClose'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeCallback) {
            scope.closeCallback();
          }
        };
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Modals
 * @description
 * # Modals
 * Service used to control modal visibility from anywhere in the application
 */
angular.module('vlui')
  .factory('Modals', ['$cacheFactory', function ($cacheFactory) {

    // TODO: The use of scope here as the method by which a modal directive
    // is registered and controlled may need to change to support retrieving
    // data from a modal as may be needed in #77
    var modalsCache = $cacheFactory('modals');

    // Public API
    return {
      register: function(id, scope) {
        if (modalsCache.get(id)) {
          console.error('Cannot register two modals with id ' + id);
          return;
        }
        modalsCache.put(id, scope);
      },

      deregister: function(id) {
        modalsCache.remove(id);
      },

      // Open a modal
      open: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = true;
      },

      // Close a modal
      close: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = false;
      },

      empty: function() {
        modalsCache.removeAll();
      },

      count: function() {
        return modalsCache.info().size;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tab
 * @description
 * # tab
 */
angular.module('vlui')
  .directive('tab', function() {
    return {
      templateUrl: 'tabs/tab.html',
      restrict: 'E',
      require: '^^tabset',
      replace: true,
      transclude: true,
      scope: {
        heading: '@'
      },
      link: function(scope, element, attrs, tabsetController) {
        tabsetController.addTab(scope);
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tabset
 * @description
 * # tabset
 */
angular.module('vlui')
  .directive('tabset', function() {
    return {
      templateUrl: 'tabs/tabset.html',
      restrict: 'E',
      transclude: true,

      // Interface for tabs to register themselves
      controller: function() {
        var self = this;

        this.tabs = [];

        this.addTab = function(tabScope) {
          // First tab is always auto-activated; others auto-deactivated
          tabScope.active = self.tabs.length === 0;
          self.tabs.push(tabScope);
        };

        this.showTab = function(selectedTab) {
          self.tabs.forEach(function(tab) {
            // Activate the selected tab, deactivate all others
            tab.active = tab === selectedTab;
          });
        };
      },

      // Expose controller to templates as "tabset"
      controllerAs: 'tabset'
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlot', ['dl', 'vl', 'vg', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', '$window', function(dl, vl, vg, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return b.priority - a.priority;
      }),
      rendering = false;

    function getRenderer(width, height) {
      // use canvas by default but use svg if the visualization is too big
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE || width*height > MAX_CANVAS_AREA) {
        return 'svg';
      }
      return 'canvas';
    }

    return {
      templateUrl: 'vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight:'=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',
      },
      replace: true,
      link: function(scope, element) {
        var HOVER_TIMEOUT = 500,
          TOOLTIP_TIMEOUT = 250;

        scope.visId = (counter++);
        scope.hoverPromise = null;
        scope.tooltipPromise = null;
        scope.hoverFocus = false;
        scope.tooltipActive = false;
        scope.destroyed = false;

        var format = dl.format.number('');

        scope.mouseover = function() {
          scope.hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, '', scope.chart.vlSpec);
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);
        };

        scope.mouseout = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, '', scope.chart.vlSpec);
          }

          $timeout.cancel(scope.hoverPromise);
          scope.hoverFocus = scope.unlocked = false;
        };

        function viewOnMouseOver(event, item) {
          if (!item || !item.datum) { return; }

          scope.tooltipPromise = $timeout(function activateTooltip(){

            // avoid showing tooltip for facet's background
            if (item.datum._facetID) return;

            scope.tooltipActive = true;
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum);


            // convert data into a format that we can easily use with ng table and ng-repeat
            // TODO: revise if this is actually a good idea
            scope.data = _(item.datum).omit('_prev', '_id') // omit vega internals
              .pairs().value()
              .map(function(p) {
                p[1] = dl.isNumber(p[1]) ? format(p[1]) : p[1];
                return p;
              });
            scope.$digest();

            var tooltip = element.find('.vis-tooltip'),
              $body = angular.element($document),
              width = tooltip.width(),
              height= tooltip.height();

            // put tooltip above if it's near the screen's bottom border
            if (event.pageY+10+height < $body.height()) {
              tooltip.css('top', (event.pageY+10));
            } else {
              tooltip.css('top', (event.pageY-10-height));
            }

            // put tooltip on left if it's near the screen's right border
            if (event.pageX+10+ width < $body.width()) {
              tooltip.css('left', (event.pageX+10));
            } else {
              tooltip.css('left', (event.pageX-10-width));
            }
          }, TOOLTIP_TIMEOUT);
        }

        function viewOnMouseOut(event, item) {
          //clear positions
          var tooltip = element.find('.vis-tooltip');
          tooltip.css('top', null);
          tooltip.css('left', null);
          $timeout.cancel(scope.tooltipPromise);
          if (scope.tooltipActive) {
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum);
          }
          scope.tooltipActive = false;
          scope.data = [];
          scope.$digest();
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) return;

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          dl.extend(vlSpec.config, Config[configSet]());

          // use chart stats if available (for example from bookmarks)
          var stats = scope.chart.stats || Dataset.stats;

          // Special Rules
          var encoding = vlSpec.encoding;
          if (encoding) {
            // put x-axis on top if too high-cardinality
            if (encoding.y && encoding.y.field && [vl.type.NOMINAL, vl.type.ORDINAL].indexOf(encoding.y.type) > -1) {
              if (encoding.x) {
                var fieldStats = stats[encoding.y.field];
                if (fieldStats && vl.fieldDef.cardinality(encoding.y, stats) > 30) {
                  (encoding.x.axis = encoding.x.axis || {}).orient = 'top';
                }
              }
            }

            // Use smaller band size if has X or Y has cardinality > 10 or has a facet
            if (encoding.row ||
                (encoding.y && stats[encoding.y.field] && vl.fieldDef.cardinality(encoding.y, stats) > 10)) {
              (encoding.y.scale = encoding.y.scale || {}).bandWidth = 12;
            }

            if (encoding.column ||
                (encoding.x && stats[encoding.x.field] && vl.fieldDef.cardinality(encoding.x, stats) > 10)) {
              (encoding.x.scale = encoding.x.scale || {}).bandWidth = 12;
            }

            if (encoding.color && encoding.color.type === vl.type.NOMINAL &&
                vl.fieldDef.cardinality(encoding.x, stats) > 10) {
              (encoding.color.scale = encoding.color.scale || {}).range = 'category20';
            }
          }

          return vl.compile(vlSpec).spec;
        }

        function getVisElement() {
          return element.find('.vega > :first-child');
        }

        function rescaleIfEnable() {
          var visElement = getVisElement();
          if (scope.rescale) {
            // have to digest the scope to ensure that
            // element.width() is bound by parent element!
            scope.$digest();

            var xRatio = Math.max(
                0.2,
                element.width() /  /* width of vlplot bounding box */
                scope.width /* width of the vis */
              );

            if (xRatio < 1) {
              visElement.width(scope.width * xRatio)
                        .height(scope.height * xRatio);
            }

          } else {
            visElement.css('transform', null)
                      .css('transform-origin', null);
          }
        }

        function getShorthand() {
          return scope.chart.shorthand || (scope.chart.vlSpec ? vl.shorthand.shorten(scope.chart.vlSpec) : '');
        }

        function renderQueueNext() {
          // render next item in the queue
          if (renderQueue.size() > 0) {
            var next = renderQueue.pop();
            next.parse();
          } else {
            // or say that no one is rendering
            rendering = false;
          }
        }

        function render(spec) {
          if (!spec) {
            if (view) {
              view.off('mouseover');
              view.off('mouseout');
            }
            return;
          }

          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = getShorthand();

          scope.renderer = getRenderer(spec);

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart.fieldSetKey))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(chart) {
              try {
                var endParse = new Date().getTime();
                view = null;
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                // view.renderer(getRenderer(spec.width, scope.height));
                view.update();

                var visElement = element.find('.vega > :first-child');
                // read  <canvas>/<svg>’s width and height, which is vega's outer width and height that includes axes and legends
                scope.width =  visElement.width();
                scope.height = visElement.height();

                if (consts.debug) {
                  $window.views = $window.views || {};
                  $window.views[shorthand] = view;
                }

                Logger.logInteraction(Logger.actions.CHART_RENDER, '', scope.chart.vlSpec);
                rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  view.on('mouseover', viewOnMouseOver);
                  view.on('mouseout', viewOnMouseOut);
                }
              } catch (e) {
                console.error(e, JSON.stringify(spec));
              } finally {
                renderQueueNext();
              }

            });
          }

          if (!rendering) { // if no instance is being render -- rendering now
            rendering=true;
            parseVega();
          } else {
            // otherwise queue it
            renderQueue.push({
              priority: scope.priority || 0,
              parse: parseVega
            });
          }
        }

        var view;
        scope.$watch(function() {
          // Omit data property to speed up deep watch
          return _.omit(scope.chart.vlSpec, 'data');
        }, function() {
          var spec = scope.chart.vgSpec = getVgSpec();
          if (!scope.chart.cleanSpec) {
            scope.chart.cleanSpec = vl.spec.getCleanSpec(scope.chart.vlSpec);
          }
          render(spec);
        }, true);

        scope.$on('$destroy', function() {
          console.log('vlplot destroyed');
          if (view) {
            view.off('mouseover');
            view.off('mouseout');
            view = null;
          }
          var shorthand = getShorthand();
          if (consts.debug && $window.views) {
            delete $window.views[shorthand];
          }

          scope.destroyed = true;
          // FIXME another way that should eliminate things from memory faster should be removing
          // maybe something like
          // renderQueue.splice(renderQueue.indexOf(parseVega), 1));
          // but without proper testing, this is riskier than setting scope.destroyed.
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'dl', 'vl', 'Dataset', 'Logger', '_', function (Bookmarks, consts, dl, vl, Dataset, Logger, _) {
    return {
      templateUrl: 'vlplotgroup/vlplotgroup.html',
      restrict: 'E',
      replace: true,
      controller: ['$scope', '$element', function($scope, $element) {
        this.getDropTarget = function() {
          return $element.find('.fa-wrench')[0];
        };
      }],
      scope: {
        /* pass to vlplot **/
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight: '=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',

        /* vlplotgroup specific */

        fieldSet: '=',

        showBookmark: '@',
        showDebug: '=',
        showExpand: '=',
        showFilterNull: '@',
        showLabel: '@',
        showLog: '@',
        showMark: '@',
        showSort: '@',
        showTranspose: '@',

        alwaysSelected: '=',
        isSelected: '=',
        highlighted: '=',
        expandAction: '&',
      },
      link: function postLink(scope) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
        scope.Dataset = Dataset;

        // Defer rendering the debug Drop popup until it is requested
        scope.renderPopup = false;
        // Use _.once because the popup only needs to be initialized once
        scope.initializePopup = _.once(function() {
          scope.renderPopup = true;
        });

        scope.logCode = function(name, value) {
          console.log(name+':\n\n', JSON.stringify(value));
        };

        // TOGGLE LOG

        scope.log = {};
        scope.log.support = function(spec, channel) {
          if (!spec) { return false; }
          var encoding = spec.encoding,
            fieldDef = encoding[channel];

          return fieldDef && fieldDef.type === vl.type.QUANTITATIVE && !fieldDef.bin;
        };

        scope.log.toggle = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale = fieldDef.scale || {};

          scale.type = scale.type === 'log' ? 'linear' : 'log';
          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand);
        };
        scope.log.active = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale = fieldDef.scale || {};

          return scale.type === 'log';
        };

        // TOGGLE FILTER
        // TODO: extract toggleFilterNull to be its own class

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand);

          spec.config = spec.config || {};
          spec.config.filterNull = spec.config.filterNull || {
            // TODO: initiate this from filterNull's schema instead
            nominal: false,
            ordinal: false,
            temporal: true,
            quantitative: true
          };
          spec.config.filterNull.ordinal = !spec.config.filterNull.ordinal;
          spec.config.filterNull.nominal = !spec.config.filterNull.nominal;
        };

        scope.toggleFilterNull.support = function(spec, stats) {
          var fieldDefs = vl.spec.fieldDefs(spec);
          for (var i in fieldDefs) {
            var fieldDef = fieldDefs[i];
            if (_.contains([vl.type.ORDINAL, vl.type.NOMINAL], fieldDef.type) &&
                (fieldDef.name in stats) &&
                stats[fieldDef.name].missing > 0
              ) {
              return true;
            }
          }
          return false;
        };

        // TOGGLE SORT
        // TODO: extract toggleSort to be its own class

        var toggleSort = scope.toggleSort = {};

        toggleSort.modes = ['ordinal-ascending', 'ordinal-descending',
          'quantitative-ascending', 'quantitative-descending', 'custom'];

        toggleSort.toggle = function(spec) {
          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand);
          var currentMode = toggleSort.mode(spec);
          var currentModeIndex = toggleSort.modes.indexOf(currentMode);

          var newModeIndex = (currentModeIndex + 1) % (toggleSort.modes.length - 1);
          var newMode = toggleSort.modes[newModeIndex];

          console.log('toggleSort', currentMode, newMode);

          var channels = toggleSort.channels(spec);
          spec.encoding[channels.ordinal].sort = toggleSort.getSort(newMode, spec);
        };

        /** Get sort property definition that matches each mode. */
        toggleSort.getSort = function(mode, spec) {
          if (mode === 'ordinal-ascending') {
            return 'ascending';
          }

          if (mode === 'ordinal-descending') {
            return 'descending';
          }

          var channels = toggleSort.channels(spec);
          var qEncDef = spec.encoding[channels.quantitative];

          if (mode === 'quantitative-ascending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'ascending'
            };
          }

          if (mode === 'quantitative-descending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'descending'
            };
          }

          return null;
        };

        toggleSort.mode = function(spec) {
          var channels = toggleSort.channels(spec);
          var sort = spec.encoding[channels.ordinal].sort;

          if (sort === undefined) {
            return 'ordinal-ascending';
          }

          for (var i = 0; i < toggleSort.modes.length - 1 ; i++) {
            // check if sort matches any of the sort for each mode except 'custom'.
            var mode = toggleSort.modes[i];
            var sortOfMode = toggleSort.getSort(mode, spec);

            if (_.isEqual(sort, sortOfMode)) {
              return mode;
            }
          }

          if (dl.isObject(sort) && sort.op && sort.field) {
            return 'custom';
          }
          console.error('invalid mode');
          return null;
        };

        toggleSort.channels = function(spec) {
          return spec.encoding.x.type === vl.type.NOMINAL || spec.encoding.x.type === vl.type.ORDINAL ?
                  {ordinal: 'x', quantitative: 'y'} :
                  {ordinal: 'y', quantitative: 'x'};
        };

        toggleSort.support = function(spec, stats) {
          var encoding = spec.encoding;

          if (vl.encoding.has(encoding, 'row') || vl.encoding.has(encoding, 'column') ||
            !vl.encoding.has(encoding, 'x') || !vl.encoding.has(encoding, 'y') ||
            !vl.spec.alwaysNoOcclusion(spec, stats)) {
            return false;
          }

          return (
              (encoding.x.type === vl.type.NOMINAL || encoding.x.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.y)
            ) ? 'x' :
            (
              (encoding.y.type === vl.type.NOMINAL || encoding.y.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.x)
            ) ? 'y' : false;
        };

        scope.toggleSortClass = function(vlSpec) {
          if (!vlSpec || !toggleSort.support(vlSpec, Dataset.stats)) {
            return 'invisible';
          }

          var ordinalChannel = vlSpec && toggleSort.channels(vlSpec).ordinal,
            mode = vlSpec && toggleSort.mode(vlSpec);

          var directionClass = ordinalChannel === 'x' ? 'sort-x ' : '';

          switch (mode) {
            case 'ordinal-ascending':
              return directionClass + 'fa-sort-alpha-asc';
            case 'ordinal-descending':
              return directionClass + 'fa-sort-alpha-desc';
            case 'quantitative-ascending':
              return directionClass + 'fa-sort-amount-asc';
            case 'quantitative-descending':
              return directionClass + 'fa-sort-amount-desc';
            default: // custom
              return directionClass + 'fa-sort';
          }
        };

        scope.transpose = function() {
          Logger.logInteraction(Logger.actions.TRANSPOSE_TOGGLE, scope.chart.shorthand);
          vl.spec.transpose(scope.chart.vlSpec);
        };

        scope.$on('$destroy', function() {
          scope.chart = null;
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroupPopup', ['Drop', function (Drop) {
    return {
      templateUrl: 'vlplotgroup/vlplotgrouppopup.html',
      restrict: 'E',
      require: '^^vlPlotGroup',
      scope: false,
      link: function postLink(scope, element, attrs, vlPlotGroupController) {
        var debugPopup = new Drop({
          content: element.find('.dev-tool')[0],
          target: vlPlotGroupController.getDropTarget(),
          position: 'bottom right',
          openOn: 'click',
          constrainToWindow: true
        });

        scope.$on('$destroy', function() {
          debugPopup.destroy();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name facetedviz.filter:reportUrl
 * @function
 * @description
 * # reportUrl
 * Filter in the facetedviz.
 */
angular.module('vlui')
  .filter('reportUrl', ['compactJSONFilter', '_', 'consts', function (compactJSONFilter, _, consts) {
    function voyagerReport(params) {
      var url = 'https://docs.google.com/forms/d/1T9ZA14F3mmzrHR7JJVUKyPXzrMqF54CjLIOjv2E7ZEM/viewform?';

      if (params.fields) {
        var query = encodeURI(compactJSONFilter(_.values(params.fields)));
        url += 'entry.1245199477=' + query + '&';
      }

      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1323680136=' + spec + '&';
      }

      if (params.spec2) {
        var spec2 = _.omit(params.spec2, 'config');
        spec2 = encodeURI(compactJSONFilter(spec2));
        url += 'entry.853137786=' + spec2 + '&';
      }

      var typeProp = 'entry.1940292677=';
      switch (params.type) {
        case 'vl':
          url += typeProp + 'Visualization+Rendering+(Vegalite)&';
          break;
        case 'vr':
          url += typeProp + 'Recommender+Algorithm+(Visrec)&';
          break;
        case 'fv':
          url += typeProp + 'Recommender+UI+(FacetedViz)&';
          break;

      }
      return url;
    }

    function vluiReport(params) {
      var url = 'https://docs.google.com/forms/d/1xKs-qGaLZEUfbTmhdmSoS13OKOEpuu_NNWE5TAAml_Y/viewform?';
      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1245199477=' + spec + '&';
      }
      return url;
    }

    return consts.appId === 'voyager' ? voyagerReport : vluiReport;
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('compactJSON', ['JSON3', function(JSON3) {
    return function(input) {
      return JSON3.stringify(input, null, '  ', 80);
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:underscore2space
 * @function
 * @description
 * # underscore2space
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('underscore2space', function () {
    return function (input) {
      return input ? input.replace(/_+/g, ' ') : '';
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:encodeUri
 * @function
 * @description
 * # encodeUri
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('encodeURI', function () {
    return function (input) {
      return window.encodeURI(input);
    };
  });
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJpbmRleC5qcyIsInRlbXBsYXRlQ2FjaGVIdG1sLmpzIiwiYWxlcnRtZXNzYWdlcy9hbGVydG1lc3NhZ2VzLmpzIiwiYWxlcnRzL2FsZXJ0cy5zZXJ2aWNlLmpzIiwiYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5qcyIsImJvb2ttYXJrcy9ib29rbWFya3Muc2VydmljZS5qcyIsImNvbmZpZy9jb25maWcuc2VydmljZS5qcyIsImRhdGFzZXQvYWRkbXlyaWFkYXRhc2V0LmpzIiwiZGF0YXNldC9hZGR1cmxkYXRhc2V0LmpzIiwiZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0LmpzIiwiZGF0YXNldC9kYXRhc2V0LnNlcnZpY2UuanMiLCJkYXRhc2V0L2RhdGFzZXRtb2RhbC5qcyIsImRhdGFzZXQvZGF0YXNldHNlbGVjdG9yLmpzIiwiZGF0YXNldC9maWxlZHJvcHpvbmUuanMiLCJkYXRhc2V0L3Bhc3RlZGF0YXNldC5qcyIsImRhdGFzZXQvc2FtcGxlZGF0YS5qcyIsImZpZWxkaW5mby9maWVsZGluZm8uanMiLCJsb2dnZXIvbG9nZ2VyLnNlcnZpY2UuanMiLCJtb2RhbC9tb2RhbC5qcyIsIm1vZGFsL21vZGFsY2xvc2VidXR0b24uanMiLCJtb2RhbC9tb2RhbHMuc2VydmljZS5qcyIsInRhYnMvdGFiLmpzIiwidGFicy90YWJzZXQuanMiLCJ2bHBsb3QvdmxwbG90LmpzIiwidmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuanMiLCJ2bHBsb3Rncm91cC92bHBsb3Rncm91cHBvcHVwLmpzIiwiZmlsdGVycy9yZXBvcnR1cmwvcmVwb3J0dXJsLmZpbHRlci5qcyIsImZpbHRlcnMvY29tcGFjdGpzb24vY29tcGFjdGpzb24uZmlsdGVyLmpzIiwiZmlsdGVycy91bmRlcnNjb3JlMnNwYWNlL3VuZGVyc2NvcmUyc3BhY2UuZmlsdGVyLmpzIiwiZmlsdGVycy9lbmNvZGV1cmkvZW5jb2RldXJpLmZpbHRlci5qcyJd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TyxvQkFBb0IsWUFBWTtJQUN0QyxPQUFPLFVBQVUsT0FBTztNQUN0QixPQUFPLFFBQVEsTUFBTSxRQUFRLE9BQU8sT0FBTzs7S0FFNUM7Ozs7QUNmTDs7Ozs7Ozs7OztBQVVBLFFBQVEsT0FBTztHQUNaLE9BQU8sYUFBYSxZQUFZO0lBQy9CLE9BQU8sVUFBVSxPQUFPO01BQ3RCLE9BQU8sT0FBTyxVQUFVOztLQUV6QiIsImZpbGUiOiJ2bHVpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBKU09OMyB3aXRoIGNvbXBhY3Qgc3RyaW5naWZ5IC0tIE1vZGlmaWVkIGJ5IEthbml0IFdvbmdzdXBoYXNhd2F0LiAgIGh0dHBzOi8vZ2l0aHViLmNvbS9rYW5pdHcvanNvbjNcbiAqXG4gKiBGb3JrZWQgZnJvbSBKU09OIHYzLjMuMiB8IGh0dHBzOi8vYmVzdGllanMuZ2l0aHViLmlvL2pzb24zIHwgQ29weXJpZ2h0IDIwMTItMjAxNCwgS2l0IENhbWJyaWRnZSB8IGh0dHA6Ly9raXQubWl0LWxpY2Vuc2Uub3JnXG4gKi9cbjsoZnVuY3Rpb24gKCkge1xuICAvLyBEZXRlY3QgdGhlIGBkZWZpbmVgIGZ1bmN0aW9uIGV4cG9zZWQgYnkgYXN5bmNocm9ub3VzIG1vZHVsZSBsb2FkZXJzLiBUaGVcbiAgLy8gc3RyaWN0IGBkZWZpbmVgIGNoZWNrIGlzIG5lY2Vzc2FyeSBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGByLmpzYC5cbiAgdmFyIGlzTG9hZGVyID0gdHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQ7XG5cbiAgLy8gQSBzZXQgb2YgdHlwZXMgdXNlZCB0byBkaXN0aW5ndWlzaCBvYmplY3RzIGZyb20gcHJpbWl0aXZlcy5cbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgIFwiZnVuY3Rpb25cIjogdHJ1ZSxcbiAgICBcIm9iamVjdFwiOiB0cnVlXG4gIH07XG5cbiAgLy8gRGV0ZWN0IHRoZSBgZXhwb3J0c2Agb2JqZWN0IGV4cG9zZWQgYnkgQ29tbW9uSlMgaW1wbGVtZW50YXRpb25zLlxuICB2YXIgZnJlZUV4cG9ydHMgPSBvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4gIC8vIFVzZSB0aGUgYGdsb2JhbGAgb2JqZWN0IGV4cG9zZWQgYnkgTm9kZSAoaW5jbHVkaW5nIEJyb3dzZXJpZnkgdmlhXG4gIC8vIGBpbnNlcnQtbW9kdWxlLWdsb2JhbHNgKSwgTmFyd2hhbCwgYW5kIFJpbmdvIGFzIHRoZSBkZWZhdWx0IGNvbnRleHQsXG4gIC8vIGFuZCB0aGUgYHdpbmRvd2Agb2JqZWN0IGluIGJyb3dzZXJzLiBSaGlubyBleHBvcnRzIGEgYGdsb2JhbGAgZnVuY3Rpb25cbiAgLy8gaW5zdGVhZC5cbiAgdmFyIHJvb3QgPSBvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cgfHwgdGhpcyxcbiAgICAgIGZyZWVHbG9iYWwgPSBmcmVlRXhwb3J0cyAmJiBvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSAmJiB0eXBlb2YgZ2xvYmFsID09IFwib2JqZWN0XCIgJiYgZ2xvYmFsO1xuXG4gIGlmIChmcmVlR2xvYmFsICYmIChmcmVlR2xvYmFsW1wiZ2xvYmFsXCJdID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWxbXCJ3aW5kb3dcIl0gPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbFtcInNlbGZcIl0gPT09IGZyZWVHbG9iYWwpKSB7XG4gICAgcm9vdCA9IGZyZWVHbG9iYWw7XG4gIH1cblxuICAvLyBQdWJsaWM6IEluaXRpYWxpemVzIEpTT04gMyB1c2luZyB0aGUgZ2l2ZW4gYGNvbnRleHRgIG9iamVjdCwgYXR0YWNoaW5nIHRoZVxuICAvLyBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBmdW5jdGlvbnMgdG8gdGhlIHNwZWNpZmllZCBgZXhwb3J0c2Agb2JqZWN0LlxuICBmdW5jdGlvbiBydW5JbkNvbnRleHQoY29udGV4dCwgZXhwb3J0cykge1xuICAgIGNvbnRleHQgfHwgKGNvbnRleHQgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuICAgIGV4cG9ydHMgfHwgKGV4cG9ydHMgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuXG4gICAgLy8gTmF0aXZlIGNvbnN0cnVjdG9yIGFsaWFzZXMuXG4gICAgdmFyIE51bWJlciA9IGNvbnRleHRbXCJOdW1iZXJcIl0gfHwgcm9vdFtcIk51bWJlclwiXSxcbiAgICAgICAgU3RyaW5nID0gY29udGV4dFtcIlN0cmluZ1wiXSB8fCByb290W1wiU3RyaW5nXCJdLFxuICAgICAgICBPYmplY3QgPSBjb250ZXh0W1wiT2JqZWN0XCJdIHx8IHJvb3RbXCJPYmplY3RcIl0sXG4gICAgICAgIERhdGUgPSBjb250ZXh0W1wiRGF0ZVwiXSB8fCByb290W1wiRGF0ZVwiXSxcbiAgICAgICAgU3ludGF4RXJyb3IgPSBjb250ZXh0W1wiU3ludGF4RXJyb3JcIl0gfHwgcm9vdFtcIlN5bnRheEVycm9yXCJdLFxuICAgICAgICBUeXBlRXJyb3IgPSBjb250ZXh0W1wiVHlwZUVycm9yXCJdIHx8IHJvb3RbXCJUeXBlRXJyb3JcIl0sXG4gICAgICAgIE1hdGggPSBjb250ZXh0W1wiTWF0aFwiXSB8fCByb290W1wiTWF0aFwiXSxcbiAgICAgICAgbmF0aXZlSlNPTiA9IGNvbnRleHRbXCJKU09OXCJdIHx8IHJvb3RbXCJKU09OXCJdO1xuXG4gICAgLy8gRGVsZWdhdGUgdG8gdGhlIG5hdGl2ZSBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBpbXBsZW1lbnRhdGlvbnMuXG4gICAgaWYgKHR5cGVvZiBuYXRpdmVKU09OID09IFwib2JqZWN0XCIgJiYgbmF0aXZlSlNPTikge1xuICAgICAgZXhwb3J0cy5zdHJpbmdpZnkgPSBuYXRpdmVKU09OLnN0cmluZ2lmeTtcbiAgICAgIGV4cG9ydHMucGFyc2UgPSBuYXRpdmVKU09OLnBhcnNlO1xuICAgIH1cblxuICAgIC8vIENvbnZlbmllbmNlIGFsaWFzZXMuXG4gICAgdmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZSxcbiAgICAgICAgZ2V0Q2xhc3MgPSBvYmplY3RQcm90by50b1N0cmluZyxcbiAgICAgICAgaXNQcm9wZXJ0eSwgZm9yRWFjaCwgdW5kZWY7XG5cbiAgICAvLyBUZXN0IHRoZSBgRGF0ZSNnZXRVVEMqYCBtZXRob2RzLiBCYXNlZCBvbiB3b3JrIGJ5IEBZYWZmbGUuXG4gICAgdmFyIGlzRXh0ZW5kZWQgPSBuZXcgRGF0ZSgtMzUwOTgyNzMzNDU3MzI5Mik7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRoZSBgZ2V0VVRDRnVsbFllYXJgLCBgTW9udGhgLCBhbmQgYERhdGVgIG1ldGhvZHMgcmV0dXJuIG5vbnNlbnNpY2FsXG4gICAgICAvLyByZXN1bHRzIGZvciBjZXJ0YWluIGRhdGVzIGluIE9wZXJhID49IDEwLjUzLlxuICAgICAgaXNFeHRlbmRlZCA9IGlzRXh0ZW5kZWQuZ2V0VVRDRnVsbFllYXIoKSA9PSAtMTA5MjUyICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTW9udGgoKSA9PT0gMCAmJiBpc0V4dGVuZGVkLmdldFVUQ0RhdGUoKSA9PT0gMSAmJlxuICAgICAgICAvLyBTYWZhcmkgPCAyLjAuMiBzdG9yZXMgdGhlIGludGVybmFsIG1pbGxpc2Vjb25kIHRpbWUgdmFsdWUgY29ycmVjdGx5LFxuICAgICAgICAvLyBidXQgY2xpcHMgdGhlIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgZGF0ZSBtZXRob2RzIHRvIHRoZSByYW5nZSBvZlxuICAgICAgICAvLyBzaWduZWQgMzItYml0IGludGVnZXJzIChbLTIgKiogMzEsIDIgKiogMzEgLSAxXSkuXG4gICAgICAgIGlzRXh0ZW5kZWQuZ2V0VVRDSG91cnMoKSA9PSAxMCAmJiBpc0V4dGVuZGVkLmdldFVUQ01pbnV0ZXMoKSA9PSAzNyAmJiBpc0V4dGVuZGVkLmdldFVUQ1NlY29uZHMoKSA9PSA2ICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTWlsbGlzZWNvbmRzKCkgPT0gNzA4O1xuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cblxuICAgIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIG5hdGl2ZSBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgcGFyc2VgXG4gICAgLy8gaW1wbGVtZW50YXRpb25zIGFyZSBzcGVjLWNvbXBsaWFudC4gQmFzZWQgb24gd29yayBieSBLZW4gU255ZGVyLlxuICAgIGZ1bmN0aW9uIGhhcyhuYW1lKSB7XG4gICAgICBpZiAoaGFzW25hbWVdICE9PSB1bmRlZikge1xuICAgICAgICAvLyBSZXR1cm4gY2FjaGVkIGZlYXR1cmUgdGVzdCByZXN1bHQuXG4gICAgICAgIHJldHVybiBoYXNbbmFtZV07XG4gICAgICB9XG4gICAgICB2YXIgaXNTdXBwb3J0ZWQ7XG4gICAgICBpZiAobmFtZSA9PSBcImJ1Zy1zdHJpbmctY2hhci1pbmRleFwiKSB7XG4gICAgICAgIC8vIElFIDw9IDcgZG9lc24ndCBzdXBwb3J0IGFjY2Vzc2luZyBzdHJpbmcgY2hhcmFjdGVycyB1c2luZyBzcXVhcmVcbiAgICAgICAgLy8gYnJhY2tldCBub3RhdGlvbi4gSUUgOCBvbmx5IHN1cHBvcnRzIHRoaXMgZm9yIHByaW1pdGl2ZXMuXG4gICAgICAgIGlzU3VwcG9ydGVkID0gXCJhXCJbMF0gIT0gXCJhXCI7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT0gXCJqc29uXCIpIHtcbiAgICAgICAgLy8gSW5kaWNhdGVzIHdoZXRoZXIgYm90aCBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgSlNPTi5wYXJzZWAgYXJlXG4gICAgICAgIC8vIHN1cHBvcnRlZC5cbiAgICAgICAgaXNTdXBwb3J0ZWQgPSBoYXMoXCJqc29uLXN0cmluZ2lmeVwiKSAmJiBoYXMoXCJqc29uLXBhcnNlXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHZhbHVlLCBzZXJpYWxpemVkID0gJ3tcImFcIjpbMSx0cnVlLGZhbHNlLG51bGwsXCJcXFxcdTAwMDBcXFxcYlxcXFxuXFxcXGZcXFxcclxcXFx0XCJdfSc7XG4gICAgICAgIC8vIFRlc3QgYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJqc29uLXN0cmluZ2lmeVwiKSB7XG4gICAgICAgICAgdmFyIHN0cmluZ2lmeSA9IGV4cG9ydHMuc3RyaW5naWZ5LCBzdHJpbmdpZnlTdXBwb3J0ZWQgPSB0eXBlb2Ygc3RyaW5naWZ5ID09IFwiZnVuY3Rpb25cIiAmJiBpc0V4dGVuZGVkO1xuICAgICAgICAgIGlmIChzdHJpbmdpZnlTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgIC8vIEEgdGVzdCBmdW5jdGlvbiBvYmplY3Qgd2l0aCBhIGN1c3RvbSBgdG9KU09OYCBtZXRob2QuXG4gICAgICAgICAgICAodmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSkudG9KU09OID0gdmFsdWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPVxuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggMy4xYjEgYW5kIGIyIHNlcmlhbGl6ZSBzdHJpbmcsIG51bWJlciwgYW5kIGJvb2xlYW5cbiAgICAgICAgICAgICAgICAvLyBwcmltaXRpdmVzIGFzIG9iamVjdCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoMCkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyLCBhbmQgSlNPTiAyIHNlcmlhbGl6ZSB3cmFwcGVkIHByaW1pdGl2ZXMgYXMgb2JqZWN0XG4gICAgICAgICAgICAgICAgLy8gbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBOdW1iZXIoKSkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBTdHJpbmcoKSkgPT0gJ1wiXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIHZhbHVlIGlzIGBudWxsYCwgYHVuZGVmaW5lZGAsIG9yXG4gICAgICAgICAgICAgICAgLy8gZG9lcyBub3QgZGVmaW5lIGEgY2Fub25pY2FsIEpTT04gcmVwcmVzZW50YXRpb24gKHRoaXMgYXBwbGllcyB0b1xuICAgICAgICAgICAgICAgIC8vIG9iamVjdHMgd2l0aCBgdG9KU09OYCBwcm9wZXJ0aWVzIGFzIHdlbGwsICp1bmxlc3MqIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIHdpdGhpbiBhbiBvYmplY3Qgb3IgYXJyYXkpLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShnZXRDbGFzcykgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gSUUgOCBzZXJpYWxpemVzIGB1bmRlZmluZWRgIGFzIGBcInVuZGVmaW5lZFwiYC4gU2FmYXJpIDw9IDUuMS43IGFuZFxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIzIHBhc3MgdGhpcyB0ZXN0LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh1bmRlZikgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS43IGFuZCBGRiAzLjFiMyB0aHJvdyBgRXJyb3JgcyBhbmQgYFR5cGVFcnJvcmBzLFxuICAgICAgICAgICAgICAgIC8vIHJlc3BlY3RpdmVseSwgaWYgdGhlIHZhbHVlIGlzIG9taXR0ZWQgZW50aXJlbHkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KCkgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIG5vdCBhIG51bWJlcixcbiAgICAgICAgICAgICAgICAvLyBzdHJpbmcsIGFycmF5LCBvYmplY3QsIEJvb2xlYW4sIG9yIGBudWxsYCBsaXRlcmFsLiBUaGlzIGFwcGxpZXMgdG9cbiAgICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMgYXMgd2VsbCwgdW5sZXNzIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIGluc2lkZSBvYmplY3Qgb3IgYXJyYXkgbGl0ZXJhbHMuIFlVSSAzLjAuMGIxIGlnbm9yZXMgY3VzdG9tIGB0b0pTT05gXG4gICAgICAgICAgICAgICAgLy8gbWV0aG9kcyBlbnRpcmVseS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkodmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdmFsdWVdKSA9PSBcIlsxXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gUHJvdG90eXBlIDw9IDEuNi4xIHNlcmlhbGl6ZXMgYFt1bmRlZmluZWRdYCBhcyBgXCJbXVwiYCBpbnN0ZWFkIG9mXG4gICAgICAgICAgICAgICAgLy8gYFwiW251bGxdXCJgLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdW5kZWZdKSA9PSBcIltudWxsXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gWVVJIDMuMC4wYjEgZmFpbHMgdG8gc2VyaWFsaXplIGBudWxsYCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCkgPT0gXCJudWxsXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiBoYWx0cyBzZXJpYWxpemF0aW9uIGlmIGFuIGFycmF5IGNvbnRhaW5zIGEgZnVuY3Rpb246XG4gICAgICAgICAgICAgICAgLy8gYFsxLCB0cnVlLCBnZXRDbGFzcywgMV1gIHNlcmlhbGl6ZXMgYXMgXCJbMSx0cnVlLF0sXCIuIEZGIDMuMWIzXG4gICAgICAgICAgICAgICAgLy8gZWxpZGVzIG5vbi1KU09OIHZhbHVlcyBmcm9tIG9iamVjdHMgYW5kIGFycmF5cywgdW5sZXNzIHRoZXlcbiAgICAgICAgICAgICAgICAvLyBkZWZpbmUgY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt1bmRlZiwgZ2V0Q2xhc3MsIG51bGxdKSA9PSBcIltudWxsLG51bGwsbnVsbF1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBzZXJpYWxpemF0aW9uIHRlc3QuIEZGIDMuMWIxIHVzZXMgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2VzXG4gICAgICAgICAgICAgICAgLy8gd2hlcmUgY2hhcmFjdGVyIGVzY2FwZSBjb2RlcyBhcmUgZXhwZWN0ZWQgKGUuZy4sIGBcXGJgID0+IGBcXHUwMDA4YCkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHsgXCJhXCI6IFt2YWx1ZSwgdHJ1ZSwgZmFsc2UsIG51bGwsIFwiXFx4MDBcXGJcXG5cXGZcXHJcXHRcIl0gfSkgPT0gc2VyaWFsaXplZCAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxIGFuZCBiMiBpZ25vcmUgdGhlIGBmaWx0ZXJgIGFuZCBgd2lkdGhgIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCwgdmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbMSwgMl0sIG51bGwsIDEpID09IFwiW1xcbiAxLFxcbiAyXFxuXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gSlNPTiAyLCBQcm90b3R5cGUgPD0gMS43LCBhbmQgb2xkZXIgV2ViS2l0IGJ1aWxkcyBpbmNvcnJlY3RseVxuICAgICAgICAgICAgICAgIC8vIHNlcmlhbGl6ZSBleHRlbmRlZCB5ZWFycy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTguNjRlMTUpKSA9PSAnXCItMjcxODIxLTA0LTIwVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBUaGUgbWlsbGlzZWNvbmRzIGFyZSBvcHRpb25hbCBpbiBFUyA1LCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSg4LjY0ZTE1KSkgPT0gJ1wiKzI3NTc2MC0wOS0xM1QwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRmlyZWZveCA8PSAxMS4wIGluY29ycmVjdGx5IHNlcmlhbGl6ZXMgeWVhcnMgcHJpb3IgdG8gMCBhcyBuZWdhdGl2ZVxuICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgeWVhcnMgaW5zdGVhZCBvZiBzaXgtZGlnaXQgeWVhcnMuIENyZWRpdHM6IEBZYWZmbGUuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC02MjE5ODc1NTJlNSkpID09ICdcIi0wMDAwMDEtMDEtMDFUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuNSBhbmQgT3BlcmEgPj0gMTAuNTMgaW5jb3JyZWN0bHkgc2VyaWFsaXplIG1pbGxpc2Vjb25kXG4gICAgICAgICAgICAgICAgLy8gdmFsdWVzIGxlc3MgdGhhbiAxMDAwLiBDcmVkaXRzOiBAWWFmZmxlLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtMSkpID09ICdcIjE5NjktMTItMzFUMjM6NTk6NTkuOTk5WlwiJztcbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaXNTdXBwb3J0ZWQgPSBzdHJpbmdpZnlTdXBwb3J0ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGVzdCBgSlNPTi5wYXJzZWAuXG4gICAgICAgIGlmIChuYW1lID09IFwianNvbi1wYXJzZVwiKSB7XG4gICAgICAgICAgdmFyIHBhcnNlID0gZXhwb3J0cy5wYXJzZTtcbiAgICAgICAgICBpZiAodHlwZW9mIHBhcnNlID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyIHdpbGwgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIGEgYmFyZSBsaXRlcmFsIGlzIHByb3ZpZGVkLlxuICAgICAgICAgICAgICAvLyBDb25mb3JtaW5nIGltcGxlbWVudGF0aW9ucyBzaG91bGQgYWxzbyBjb2VyY2UgdGhlIGluaXRpYWwgYXJndW1lbnQgdG9cbiAgICAgICAgICAgICAgLy8gYSBzdHJpbmcgcHJpb3IgdG8gcGFyc2luZy5cbiAgICAgICAgICAgICAgaWYgKHBhcnNlKFwiMFwiKSA9PT0gMCAmJiAhcGFyc2UoZmFsc2UpKSB7XG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIHBhcnNpbmcgdGVzdC5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHBhcnNlKHNlcmlhbGl6ZWQpO1xuICAgICAgICAgICAgICAgIHZhciBwYXJzZVN1cHBvcnRlZCA9IHZhbHVlW1wiYVwiXS5sZW5ndGggPT0gNSAmJiB2YWx1ZVtcImFcIl1bMF0gPT09IDE7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjIgYW5kIEZGIDMuMWIxIGFsbG93IHVuZXNjYXBlZCB0YWJzIGluIHN0cmluZ3MuXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gIXBhcnNlKCdcIlxcdFwiJyk7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGRiA0LjAgYW5kIDQuMC4xIGFsbG93IGxlYWRpbmcgYCtgIHNpZ25zIGFuZCBsZWFkaW5nXG4gICAgICAgICAgICAgICAgICAgICAgLy8gZGVjaW1hbCBwb2ludHMuIEZGIDQuMCwgNC4wLjEsIGFuZCBJRSA5LTEwIGFsc28gYWxsb3dcbiAgICAgICAgICAgICAgICAgICAgICAvLyBjZXJ0YWluIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gcGFyc2UoXCIwMVwiKSAhPT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wLCA0LjAuMSwgYW5kIFJoaW5vIDEuN1IzLVI0IGFsbG93IHRyYWlsaW5nIGRlY2ltYWxcbiAgICAgICAgICAgICAgICAgICAgICAvLyBwb2ludHMuIFRoZXNlIGVudmlyb25tZW50cywgYWxvbmcgd2l0aCBGRiAzLjFiMSBhbmQgMixcbiAgICAgICAgICAgICAgICAgICAgICAvLyBhbHNvIGFsbG93IHRyYWlsaW5nIGNvbW1hcyBpbiBKU09OIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMS5cIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpc1N1cHBvcnRlZCA9IHBhcnNlU3VwcG9ydGVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGFzW25hbWVdID0gISFpc1N1cHBvcnRlZDtcbiAgICB9XG5cbiAgICBpZiAodHJ1ZSkgeyAvLyB1c2VkIHRvIGJlICFoYXMoXCJqc29uXCIpXG4gICAgICAvLyBDb21tb24gYFtbQ2xhc3NdXWAgbmFtZSBhbGlhc2VzLlxuICAgICAgdmFyIGZ1bmN0aW9uQ2xhc3MgPSBcIltvYmplY3QgRnVuY3Rpb25dXCIsXG4gICAgICAgICAgZGF0ZUNsYXNzID0gXCJbb2JqZWN0IERhdGVdXCIsXG4gICAgICAgICAgbnVtYmVyQ2xhc3MgPSBcIltvYmplY3QgTnVtYmVyXVwiLFxuICAgICAgICAgIHN0cmluZ0NsYXNzID0gXCJbb2JqZWN0IFN0cmluZ11cIixcbiAgICAgICAgICBhcnJheUNsYXNzID0gXCJbb2JqZWN0IEFycmF5XVwiLFxuICAgICAgICAgIGJvb2xlYW5DbGFzcyA9IFwiW29iamVjdCBCb29sZWFuXVwiO1xuXG4gICAgICAvLyBEZXRlY3QgaW5jb21wbGV0ZSBzdXBwb3J0IGZvciBhY2Nlc3Npbmcgc3RyaW5nIGNoYXJhY3RlcnMgYnkgaW5kZXguXG4gICAgICB2YXIgY2hhckluZGV4QnVnZ3kgPSBoYXMoXCJidWctc3RyaW5nLWNoYXItaW5kZXhcIik7XG5cbiAgICAgIC8vIERlZmluZSBhZGRpdGlvbmFsIHV0aWxpdHkgbWV0aG9kcyBpZiB0aGUgYERhdGVgIG1ldGhvZHMgYXJlIGJ1Z2d5LlxuICAgICAgaWYgKCFpc0V4dGVuZGVkKSB7XG4gICAgICAgIHZhciBmbG9vciA9IE1hdGguZmxvb3I7XG4gICAgICAgIC8vIEEgbWFwcGluZyBiZXR3ZWVuIHRoZSBtb250aHMgb2YgdGhlIHllYXIgYW5kIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuXG4gICAgICAgIC8vIEphbnVhcnkgMXN0IGFuZCB0aGUgZmlyc3Qgb2YgdGhlIHJlc3BlY3RpdmUgbW9udGguXG4gICAgICAgIHZhciBNb250aHMgPSBbMCwgMzEsIDU5LCA5MCwgMTIwLCAxNTEsIDE4MSwgMjEyLCAyNDMsIDI3MywgMzA0LCAzMzRdO1xuICAgICAgICAvLyBJbnRlcm5hbDogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIGRheXMgYmV0d2VlbiB0aGUgVW5peCBlcG9jaCBhbmQgdGhlXG4gICAgICAgIC8vIGZpcnN0IGRheSBvZiB0aGUgZ2l2ZW4gbW9udGguXG4gICAgICAgIHZhciBnZXREYXkgPSBmdW5jdGlvbiAoeWVhciwgbW9udGgpIHtcbiAgICAgICAgICByZXR1cm4gTW9udGhzW21vbnRoXSArIDM2NSAqICh5ZWFyIC0gMTk3MCkgKyBmbG9vcigoeWVhciAtIDE5NjkgKyAobW9udGggPSArKG1vbnRoID4gMSkpKSAvIDQpIC0gZmxvb3IoKHllYXIgLSAxOTAxICsgbW9udGgpIC8gMTAwKSArIGZsb29yKCh5ZWFyIC0gMTYwMSArIG1vbnRoKSAvIDQwMCk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIGlmIGEgcHJvcGVydHkgaXMgYSBkaXJlY3QgcHJvcGVydHkgb2YgdGhlIGdpdmVuXG4gICAgICAvLyBvYmplY3QuIERlbGVnYXRlcyB0byB0aGUgbmF0aXZlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIG1ldGhvZC5cbiAgICAgIGlmICghKGlzUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eSkpIHtcbiAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgIHZhciBtZW1iZXJzID0ge30sIGNvbnN0cnVjdG9yO1xuICAgICAgICAgIGlmICgobWVtYmVycy5fX3Byb3RvX18gPSBudWxsLCBtZW1iZXJzLl9fcHJvdG9fXyA9IHtcbiAgICAgICAgICAgIC8vIFRoZSAqcHJvdG8qIHByb3BlcnR5IGNhbm5vdCBiZSBzZXQgbXVsdGlwbGUgdGltZXMgaW4gcmVjZW50XG4gICAgICAgICAgICAvLyB2ZXJzaW9ucyBvZiBGaXJlZm94IGFuZCBTZWFNb25rZXkuXG4gICAgICAgICAgICBcInRvU3RyaW5nXCI6IDFcbiAgICAgICAgICB9LCBtZW1iZXJzKS50b1N0cmluZyAhPSBnZXRDbGFzcykge1xuICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC4zIGRvZXNuJ3QgaW1wbGVtZW50IGBPYmplY3QjaGFzT3duUHJvcGVydHlgLCBidXRcbiAgICAgICAgICAgIC8vIHN1cHBvcnRzIHRoZSBtdXRhYmxlICpwcm90byogcHJvcGVydHkuXG4gICAgICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIC8vIENhcHR1cmUgYW5kIGJyZWFrIHRoZSBvYmplY3QncyBwcm90b3R5cGUgY2hhaW4gKHNlZSBzZWN0aW9uIDguNi4yXG4gICAgICAgICAgICAgIC8vIG9mIHRoZSBFUyA1LjEgc3BlYykuIFRoZSBwYXJlbnRoZXNpemVkIGV4cHJlc3Npb24gcHJldmVudHMgYW5cbiAgICAgICAgICAgICAgLy8gdW5zYWZlIHRyYW5zZm9ybWF0aW9uIGJ5IHRoZSBDbG9zdXJlIENvbXBpbGVyLlxuICAgICAgICAgICAgICB2YXIgb3JpZ2luYWwgPSB0aGlzLl9fcHJvdG9fXywgcmVzdWx0ID0gcHJvcGVydHkgaW4gKHRoaXMuX19wcm90b19fID0gbnVsbCwgdGhpcyk7XG4gICAgICAgICAgICAgIC8vIFJlc3RvcmUgdGhlIG9yaWdpbmFsIHByb3RvdHlwZSBjaGFpbi5cbiAgICAgICAgICAgICAgdGhpcy5fX3Byb3RvX18gPSBvcmlnaW5hbDtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENhcHR1cmUgYSByZWZlcmVuY2UgdG8gdGhlIHRvcC1sZXZlbCBgT2JqZWN0YCBjb25zdHJ1Y3Rvci5cbiAgICAgICAgICAgIGNvbnN0cnVjdG9yID0gbWVtYmVycy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgYGNvbnN0cnVjdG9yYCBwcm9wZXJ0eSB0byBzaW11bGF0ZSBgT2JqZWN0I2hhc093blByb3BlcnR5YCBpblxuICAgICAgICAgICAgLy8gb3RoZXIgZW52aXJvbm1lbnRzLlxuICAgICAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICB2YXIgcGFyZW50ID0gKHRoaXMuY29uc3RydWN0b3IgfHwgY29uc3RydWN0b3IpLnByb3RvdHlwZTtcbiAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5IGluIHRoaXMgJiYgIShwcm9wZXJ0eSBpbiBwYXJlbnQgJiYgdGhpc1twcm9wZXJ0eV0gPT09IHBhcmVudFtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbWVtYmVycyA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIGlzUHJvcGVydHkuY2FsbCh0aGlzLCBwcm9wZXJ0eSk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEludGVybmFsOiBOb3JtYWxpemVzIHRoZSBgZm9yLi4uaW5gIGl0ZXJhdGlvbiBhbGdvcml0aG0gYWNyb3NzXG4gICAgICAvLyBlbnZpcm9ubWVudHMuIEVhY2ggZW51bWVyYXRlZCBrZXkgaXMgeWllbGRlZCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uXG4gICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNpemUgPSAwLCBQcm9wZXJ0aWVzLCBtZW1iZXJzLCBwcm9wZXJ0eTtcblxuICAgICAgICAvLyBUZXN0cyBmb3IgYnVncyBpbiB0aGUgY3VycmVudCBlbnZpcm9ubWVudCdzIGBmb3IuLi5pbmAgYWxnb3JpdGhtLiBUaGVcbiAgICAgICAgLy8gYHZhbHVlT2ZgIHByb3BlcnR5IGluaGVyaXRzIHRoZSBub24tZW51bWVyYWJsZSBmbGFnIGZyb21cbiAgICAgICAgLy8gYE9iamVjdC5wcm90b3R5cGVgIGluIG9sZGVyIHZlcnNpb25zIG9mIElFLCBOZXRzY2FwZSwgYW5kIE1vemlsbGEuXG4gICAgICAgIChQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRoaXMudmFsdWVPZiA9IDA7XG4gICAgICAgIH0pLnByb3RvdHlwZS52YWx1ZU9mID0gMDtcblxuICAgICAgICAvLyBJdGVyYXRlIG92ZXIgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIGBQcm9wZXJ0aWVzYCBjbGFzcy5cbiAgICAgICAgbWVtYmVycyA9IG5ldyBQcm9wZXJ0aWVzKCk7XG4gICAgICAgIGZvciAocHJvcGVydHkgaW4gbWVtYmVycykge1xuICAgICAgICAgIC8vIElnbm9yZSBhbGwgcHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBgT2JqZWN0LnByb3RvdHlwZWAuXG4gICAgICAgICAgaWYgKGlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgUHJvcGVydGllcyA9IG1lbWJlcnMgPSBudWxsO1xuXG4gICAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgaXRlcmF0aW9uIGFsZ29yaXRobS5cbiAgICAgICAgaWYgKCFzaXplKSB7XG4gICAgICAgICAgLy8gQSBsaXN0IG9mIG5vbi1lbnVtZXJhYmxlIHByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gYE9iamVjdC5wcm90b3R5cGVgLlxuICAgICAgICAgIG1lbWJlcnMgPSBbXCJ2YWx1ZU9mXCIsIFwidG9TdHJpbmdcIiwgXCJ0b0xvY2FsZVN0cmluZ1wiLCBcInByb3BlcnR5SXNFbnVtZXJhYmxlXCIsIFwiaXNQcm90b3R5cGVPZlwiLCBcImhhc093blByb3BlcnR5XCIsIFwiY29uc3RydWN0b3JcIl07XG4gICAgICAgICAgLy8gSUUgPD0gOCwgTW96aWxsYSAxLjAsIGFuZCBOZXRzY2FwZSA2LjIgaWdub3JlIHNoYWRvd2VkIG5vbi1lbnVtZXJhYmxlXG4gICAgICAgICAgLy8gcHJvcGVydGllcy5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5LCBsZW5ndGg7XG4gICAgICAgICAgICB2YXIgaGFzUHJvcGVydHkgPSAhaXNGdW5jdGlvbiAmJiB0eXBlb2Ygb2JqZWN0LmNvbnN0cnVjdG9yICE9IFwiZnVuY3Rpb25cIiAmJiBvYmplY3RUeXBlc1t0eXBlb2Ygb2JqZWN0Lmhhc093blByb3BlcnR5XSAmJiBvYmplY3QuaGFzT3duUHJvcGVydHkgfHwgaXNQcm9wZXJ0eTtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIEdlY2tvIDw9IDEuMCBlbnVtZXJhdGVzIHRoZSBgcHJvdG90eXBlYCBwcm9wZXJ0eSBvZiBmdW5jdGlvbnMgdW5kZXJcbiAgICAgICAgICAgICAgLy8gY2VydGFpbiBjb25kaXRpb25zOyBJRSBkb2VzIG5vdC5cbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiBoYXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciBlYWNoIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5LlxuICAgICAgICAgICAgZm9yIChsZW5ndGggPSBtZW1iZXJzLmxlbmd0aDsgcHJvcGVydHkgPSBtZW1iZXJzWy0tbGVuZ3RoXTsgaGFzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSAmJiBjYWxsYmFjayhwcm9wZXJ0eSkpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoc2l6ZSA9PSAyKSB7XG4gICAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC40IGVudW1lcmF0ZXMgc2hhZG93ZWQgcHJvcGVydGllcyB0d2ljZS5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHNldCBvZiBpdGVyYXRlZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgdmFyIG1lbWJlcnMgPSB7fSwgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eTtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIFN0b3JlIGVhY2ggcHJvcGVydHkgbmFtZSB0byBwcmV2ZW50IGRvdWJsZSBlbnVtZXJhdGlvbi4gVGhlXG4gICAgICAgICAgICAgIC8vIGBwcm90b3R5cGVgIHByb3BlcnR5IG9mIGZ1bmN0aW9ucyBpcyBub3QgZW51bWVyYXRlZCBkdWUgdG8gY3Jvc3MtXG4gICAgICAgICAgICAgIC8vIGVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiAhaXNQcm9wZXJ0eS5jYWxsKG1lbWJlcnMsIHByb3BlcnR5KSAmJiAobWVtYmVyc1twcm9wZXJ0eV0gPSAxKSAmJiBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vIGJ1Z3MgZGV0ZWN0ZWQ7IHVzZSB0aGUgc3RhbmRhcmQgYGZvci4uLmluYCBhbGdvcml0aG0uXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eSwgaXNDb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpICYmICEoaXNDb25zdHJ1Y3RvciA9IHByb3BlcnR5ID09PSBcImNvbnN0cnVjdG9yXCIpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciB0aGUgYGNvbnN0cnVjdG9yYCBwcm9wZXJ0eSBkdWUgdG9cbiAgICAgICAgICAgIC8vIGNyb3NzLWVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgICAgIGlmIChpc0NvbnN0cnVjdG9yIHx8IGlzUHJvcGVydHkuY2FsbChvYmplY3QsIChwcm9wZXJ0eSA9IFwiY29uc3RydWN0b3JcIikpKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmb3JFYWNoKG9iamVjdCwgY2FsbGJhY2spO1xuICAgICAgfTtcblxuICAgICAgLy8gUHVibGljOiBTZXJpYWxpemVzIGEgSmF2YVNjcmlwdCBgdmFsdWVgIGFzIGEgSlNPTiBzdHJpbmcuIFRoZSBvcHRpb25hbFxuICAgICAgLy8gYGZpbHRlcmAgYXJndW1lbnQgbWF5IHNwZWNpZnkgZWl0aGVyIGEgZnVuY3Rpb24gdGhhdCBhbHRlcnMgaG93IG9iamVjdCBhbmRcbiAgICAgIC8vIGFycmF5IG1lbWJlcnMgYXJlIHNlcmlhbGl6ZWQsIG9yIGFuIGFycmF5IG9mIHN0cmluZ3MgYW5kIG51bWJlcnMgdGhhdFxuICAgICAgLy8gaW5kaWNhdGVzIHdoaWNoIHByb3BlcnRpZXMgc2hvdWxkIGJlIHNlcmlhbGl6ZWQuIFRoZSBvcHRpb25hbCBgd2lkdGhgXG4gICAgICAvLyBhcmd1bWVudCBtYXkgYmUgZWl0aGVyIGEgc3RyaW5nIG9yIG51bWJlciB0aGF0IHNwZWNpZmllcyB0aGUgaW5kZW50YXRpb25cbiAgICAgIC8vIGxldmVsIG9mIHRoZSBvdXRwdXQuXG4gICAgICBpZiAodHJ1ZSkge1xuICAgICAgICAvLyBJbnRlcm5hbDogQSBtYXAgb2YgY29udHJvbCBjaGFyYWN0ZXJzIGFuZCB0aGVpciBlc2NhcGVkIGVxdWl2YWxlbnRzLlxuICAgICAgICB2YXIgRXNjYXBlcyA9IHtcbiAgICAgICAgICA5MjogXCJcXFxcXFxcXFwiLFxuICAgICAgICAgIDM0OiAnXFxcXFwiJyxcbiAgICAgICAgICA4OiBcIlxcXFxiXCIsXG4gICAgICAgICAgMTI6IFwiXFxcXGZcIixcbiAgICAgICAgICAxMDogXCJcXFxcblwiLFxuICAgICAgICAgIDEzOiBcIlxcXFxyXCIsXG4gICAgICAgICAgOTogXCJcXFxcdFwiXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IENvbnZlcnRzIGB2YWx1ZWAgaW50byBhIHplcm8tcGFkZGVkIHN0cmluZyBzdWNoIHRoYXQgaXRzXG4gICAgICAgIC8vIGxlbmd0aCBpcyBhdCBsZWFzdCBlcXVhbCB0byBgd2lkdGhgLiBUaGUgYHdpZHRoYCBtdXN0IGJlIDw9IDYuXG4gICAgICAgIHZhciBsZWFkaW5nWmVyb2VzID0gXCIwMDAwMDBcIjtcbiAgICAgICAgdmFyIHRvUGFkZGVkU3RyaW5nID0gZnVuY3Rpb24gKHdpZHRoLCB2YWx1ZSkge1xuICAgICAgICAgIC8vIFRoZSBgfHwgMGAgZXhwcmVzc2lvbiBpcyBuZWNlc3NhcnkgdG8gd29yayBhcm91bmQgYSBidWcgaW5cbiAgICAgICAgICAvLyBPcGVyYSA8PSA3LjU0dTIgd2hlcmUgYDAgPT0gLTBgLCBidXQgYFN0cmluZygtMCkgIT09IFwiMFwiYC5cbiAgICAgICAgICByZXR1cm4gKGxlYWRpbmdaZXJvZXMgKyAodmFsdWUgfHwgMCkpLnNsaWNlKC13aWR0aCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IERvdWJsZS1xdW90ZXMgYSBzdHJpbmcgYHZhbHVlYCwgcmVwbGFjaW5nIGFsbCBBU0NJSSBjb250cm9sXG4gICAgICAgIC8vIGNoYXJhY3RlcnMgKGNoYXJhY3RlcnMgd2l0aCBjb2RlIHVuaXQgdmFsdWVzIGJldHdlZW4gMCBhbmQgMzEpIHdpdGhcbiAgICAgICAgLy8gdGhlaXIgZXNjYXBlZCBlcXVpdmFsZW50cy4gVGhpcyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGVcbiAgICAgICAgLy8gYFF1b3RlKHZhbHVlKWAgb3BlcmF0aW9uIGRlZmluZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMy5cbiAgICAgICAgdmFyIHVuaWNvZGVQcmVmaXggPSBcIlxcXFx1MDBcIjtcbiAgICAgICAgdmFyIHF1b3RlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdCA9ICdcIicsIGluZGV4ID0gMCwgbGVuZ3RoID0gdmFsdWUubGVuZ3RoLCB1c2VDaGFySW5kZXggPSAhY2hhckluZGV4QnVnZ3kgfHwgbGVuZ3RoID4gMTA7XG4gICAgICAgICAgdmFyIHN5bWJvbHMgPSB1c2VDaGFySW5kZXggJiYgKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuc3BsaXQoXCJcIikgOiB2YWx1ZSk7XG4gICAgICAgICAgZm9yICg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICB2YXIgY2hhckNvZGUgPSB2YWx1ZS5jaGFyQ29kZUF0KGluZGV4KTtcbiAgICAgICAgICAgIC8vIElmIHRoZSBjaGFyYWN0ZXIgaXMgYSBjb250cm9sIGNoYXJhY3RlciwgYXBwZW5kIGl0cyBVbmljb2RlIG9yXG4gICAgICAgICAgICAvLyBzaG9ydGhhbmQgZXNjYXBlIHNlcXVlbmNlOyBvdGhlcndpc2UsIGFwcGVuZCB0aGUgY2hhcmFjdGVyIGFzLWlzLlxuICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICBjYXNlIDg6IGNhc2UgOTogY2FzZSAxMDogY2FzZSAxMjogY2FzZSAxMzogY2FzZSAzNDogY2FzZSA5MjpcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gRXNjYXBlc1tjaGFyQ29kZV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlIDwgMzIpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCArPSB1bmljb2RlUHJlZml4ICsgdG9QYWRkZWRTdHJpbmcoMiwgY2hhckNvZGUudG9TdHJpbmcoMTYpKTtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gdXNlQ2hhckluZGV4ID8gc3ltYm9sc1tpbmRleF0gOiB2YWx1ZS5jaGFyQXQoaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzdWx0ICsgJ1wiJztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVjdXJzaXZlbHkgc2VyaWFsaXplcyBhbiBvYmplY3QuIEltcGxlbWVudHMgdGhlXG4gICAgICAgIC8vIGBTdHIoa2V5LCBob2xkZXIpYCwgYEpPKHZhbHVlKWAsIGFuZCBgSkEodmFsdWUpYCBvcGVyYXRpb25zLlxuICAgICAgICB2YXIgc2VyaWFsaXplID0gZnVuY3Rpb24gKHByb3BlcnR5LCBvYmplY3QsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbiwgc3RhY2ssIG1heExpbmVMZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUsIGNsYXNzTmFtZSwgeWVhciwgbW9udGgsIGRhdGUsIHRpbWUsIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtaWxsaXNlY29uZHMsIHJlc3VsdHMsIGVsZW1lbnQsIGluZGV4LCBsZW5ndGgsIHByZWZpeCwgcmVzdWx0O1xuXG4gICAgICAgICAgbWF4TGluZUxlbmd0aCA9IG1heExpbmVMZW5ndGggfHwgMDtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBOZWNlc3NhcnkgZm9yIGhvc3Qgb2JqZWN0IHN1cHBvcnQuXG4gICAgICAgICAgICB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIiAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGRhdGVDbGFzcyAmJiAhaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkge1xuICAgICAgICAgICAgICBpZiAodmFsdWUgPiAtMSAvIDAgJiYgdmFsdWUgPCAxIC8gMCkge1xuICAgICAgICAgICAgICAgIC8vIERhdGVzIGFyZSBzZXJpYWxpemVkIGFjY29yZGluZyB0byB0aGUgYERhdGUjdG9KU09OYCBtZXRob2RcbiAgICAgICAgICAgICAgICAvLyBzcGVjaWZpZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuOS41LjQ0LiBTZWUgc2VjdGlvbiAxNS45LjEuMTVcbiAgICAgICAgICAgICAgICAvLyBmb3IgdGhlIElTTyA4NjAxIGRhdGUgdGltZSBzdHJpbmcgZm9ybWF0LlxuICAgICAgICAgICAgICAgIGlmIChnZXREYXkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbXB1dGUgdGhlIHllYXIsIG1vbnRoLCBkYXRlLCBob3VycywgbWludXRlcyxcbiAgICAgICAgICAgICAgICAgIC8vIHNlY29uZHMsIGFuZCBtaWxsaXNlY29uZHMgaWYgdGhlIGBnZXRVVEMqYCBtZXRob2RzIGFyZVxuICAgICAgICAgICAgICAgICAgLy8gYnVnZ3kuIEFkYXB0ZWQgZnJvbSBAWWFmZmxlJ3MgYGRhdGUtc2hpbWAgcHJvamVjdC5cbiAgICAgICAgICAgICAgICAgIGRhdGUgPSBmbG9vcih2YWx1ZSAvIDg2NGU1KTtcbiAgICAgICAgICAgICAgICAgIGZvciAoeWVhciA9IGZsb29yKGRhdGUgLyAzNjUuMjQyNSkgKyAxOTcwIC0gMTsgZ2V0RGF5KHllYXIgKyAxLCAwKSA8PSBkYXRlOyB5ZWFyKyspO1xuICAgICAgICAgICAgICAgICAgZm9yIChtb250aCA9IGZsb29yKChkYXRlIC0gZ2V0RGF5KHllYXIsIDApKSAvIDMwLjQyKTsgZ2V0RGF5KHllYXIsIG1vbnRoICsgMSkgPD0gZGF0ZTsgbW9udGgrKyk7XG4gICAgICAgICAgICAgICAgICBkYXRlID0gMSArIGRhdGUgLSBnZXREYXkoeWVhciwgbW9udGgpO1xuICAgICAgICAgICAgICAgICAgLy8gVGhlIGB0aW1lYCB2YWx1ZSBzcGVjaWZpZXMgdGhlIHRpbWUgd2l0aGluIHRoZSBkYXkgKHNlZSBFU1xuICAgICAgICAgICAgICAgICAgLy8gNS4xIHNlY3Rpb24gMTUuOS4xLjIpLiBUaGUgZm9ybXVsYSBgKEEgJSBCICsgQikgJSBCYCBpcyB1c2VkXG4gICAgICAgICAgICAgICAgICAvLyB0byBjb21wdXRlIGBBIG1vZHVsbyBCYCwgYXMgdGhlIGAlYCBvcGVyYXRvciBkb2VzIG5vdFxuICAgICAgICAgICAgICAgICAgLy8gY29ycmVzcG9uZCB0byB0aGUgYG1vZHVsb2Agb3BlcmF0aW9uIGZvciBuZWdhdGl2ZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgICAgdGltZSA9ICh2YWx1ZSAlIDg2NGU1ICsgODY0ZTUpICUgODY0ZTU7XG4gICAgICAgICAgICAgICAgICAvLyBUaGUgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMsIGFuZCBtaWxsaXNlY29uZHMgYXJlIG9idGFpbmVkIGJ5XG4gICAgICAgICAgICAgICAgICAvLyBkZWNvbXBvc2luZyB0aGUgdGltZSB3aXRoaW4gdGhlIGRheS4gU2VlIHNlY3Rpb24gMTUuOS4xLjEwLlxuICAgICAgICAgICAgICAgICAgaG91cnMgPSBmbG9vcih0aW1lIC8gMzZlNSkgJSAyNDtcbiAgICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSBmbG9vcih0aW1lIC8gNmU0KSAlIDYwO1xuICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9IGZsb29yKHRpbWUgLyAxZTMpICUgNjA7XG4gICAgICAgICAgICAgICAgICBtaWxsaXNlY29uZHMgPSB0aW1lICUgMWUzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB5ZWFyID0gdmFsdWUuZ2V0VVRDRnVsbFllYXIoKTtcbiAgICAgICAgICAgICAgICAgIG1vbnRoID0gdmFsdWUuZ2V0VVRDTW9udGgoKTtcbiAgICAgICAgICAgICAgICAgIGRhdGUgPSB2YWx1ZS5nZXRVVENEYXRlKCk7XG4gICAgICAgICAgICAgICAgICBob3VycyA9IHZhbHVlLmdldFVUQ0hvdXJzKCk7XG4gICAgICAgICAgICAgICAgICBtaW51dGVzID0gdmFsdWUuZ2V0VVRDTWludXRlcygpO1xuICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9IHZhbHVlLmdldFVUQ1NlY29uZHMoKTtcbiAgICAgICAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IHZhbHVlLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTZXJpYWxpemUgZXh0ZW5kZWQgeWVhcnMgY29ycmVjdGx5LlxuICAgICAgICAgICAgICAgIHZhbHVlID0gKHllYXIgPD0gMCB8fCB5ZWFyID49IDFlNCA/ICh5ZWFyIDwgMCA/IFwiLVwiIDogXCIrXCIpICsgdG9QYWRkZWRTdHJpbmcoNiwgeWVhciA8IDAgPyAteWVhciA6IHllYXIpIDogdG9QYWRkZWRTdHJpbmcoNCwgeWVhcikpICtcbiAgICAgICAgICAgICAgICAgIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbW9udGggKyAxKSArIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgZGF0ZSkgK1xuICAgICAgICAgICAgICAgICAgLy8gTW9udGhzLCBkYXRlcywgaG91cnMsIG1pbnV0ZXMsIGFuZCBzZWNvbmRzIHNob3VsZCBoYXZlIHR3b1xuICAgICAgICAgICAgICAgICAgLy8gZGlnaXRzOyBtaWxsaXNlY29uZHMgc2hvdWxkIGhhdmUgdGhyZWUuXG4gICAgICAgICAgICAgICAgICBcIlRcIiArIHRvUGFkZGVkU3RyaW5nKDIsIGhvdXJzKSArIFwiOlwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbWludXRlcykgKyBcIjpcIiArIHRvUGFkZGVkU3RyaW5nKDIsIHNlY29uZHMpICtcbiAgICAgICAgICAgICAgICAgIC8vIE1pbGxpc2Vjb25kcyBhcmUgb3B0aW9uYWwgaW4gRVMgNS4wLCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICAgICAgXCIuXCIgKyB0b1BhZGRlZFN0cmluZygzLCBtaWxsaXNlY29uZHMpICsgXCJaXCI7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZS50b0pTT04gPT0gXCJmdW5jdGlvblwiICYmICgoY2xhc3NOYW1lICE9IG51bWJlckNsYXNzICYmIGNsYXNzTmFtZSAhPSBzdHJpbmdDbGFzcyAmJiBjbGFzc05hbWUgIT0gYXJyYXlDbGFzcykgfHwgaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkpIHtcbiAgICAgICAgICAgICAgLy8gUHJvdG90eXBlIDw9IDEuNi4xIGFkZHMgbm9uLXN0YW5kYXJkIGB0b0pTT05gIG1ldGhvZHMgdG8gdGhlXG4gICAgICAgICAgICAgIC8vIGBOdW1iZXJgLCBgU3RyaW5nYCwgYERhdGVgLCBhbmQgYEFycmF5YCBwcm90b3R5cGVzLiBKU09OIDNcbiAgICAgICAgICAgICAgLy8gaWdub3JlcyBhbGwgYHRvSlNPTmAgbWV0aG9kcyBvbiB0aGVzZSBvYmplY3RzIHVubGVzcyB0aGV5IGFyZVxuICAgICAgICAgICAgICAvLyBkZWZpbmVkIGRpcmVjdGx5IG9uIGFuIGluc3RhbmNlLlxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRvSlNPTihwcm9wZXJ0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gSWYgYSByZXBsYWNlbWVudCBmdW5jdGlvbiB3YXMgcHJvdmlkZWQsIGNhbGwgaXQgdG8gb2J0YWluIHRoZSB2YWx1ZVxuICAgICAgICAgICAgLy8gZm9yIHNlcmlhbGl6YXRpb24uXG4gICAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrLmNhbGwob2JqZWN0LCBwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSk7XG4gICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBib29sZWFuQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIEJvb2xlYW5zIGFyZSByZXByZXNlbnRlZCBsaXRlcmFsbHkuXG4gICAgICAgICAgICByZXR1cm4gXCJcIiArIHZhbHVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IG51bWJlckNsYXNzKSB7XG4gICAgICAgICAgICAvLyBKU09OIG51bWJlcnMgbXVzdCBiZSBmaW5pdGUuIGBJbmZpbml0eWAgYW5kIGBOYU5gIGFyZSBzZXJpYWxpemVkIGFzXG4gICAgICAgICAgICAvLyBgXCJudWxsXCJgLlxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlID4gLTEgLyAwICYmIHZhbHVlIDwgMSAvIDAgPyBcIlwiICsgdmFsdWUgOiBcIm51bGxcIjtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcykge1xuICAgICAgICAgICAgLy8gU3RyaW5ncyBhcmUgZG91YmxlLXF1b3RlZCBhbmQgZXNjYXBlZC5cbiAgICAgICAgICAgIHJldHVybiBxdW90ZShcIlwiICsgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGlzIGlzIGEgbGluZWFyIHNlYXJjaDsgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgIC8vIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZiB1bmlxdWUgbmVzdGVkIG9iamVjdHMuXG4gICAgICAgICAgICBmb3IgKGxlbmd0aCA9IHN0YWNrLmxlbmd0aDsgbGVuZ3RoLS07KSB7XG4gICAgICAgICAgICAgIGlmIChzdGFja1tsZW5ndGhdID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIEN5Y2xpYyBzdHJ1Y3R1cmVzIGNhbm5vdCBiZSBzZXJpYWxpemVkIGJ5IGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFkZCB0aGUgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICAgICAgICAgIHN0YWNrLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgLy8gU2F2ZSB0aGUgY3VycmVudCBpbmRlbnRhdGlvbiBsZXZlbCBhbmQgaW5kZW50IG9uZSBhZGRpdGlvbmFsIGxldmVsLlxuICAgICAgICAgICAgcHJlZml4ID0gaW5kZW50YXRpb247XG4gICAgICAgICAgICBpbmRlbnRhdGlvbiArPSB3aGl0ZXNwYWNlO1xuICAgICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIHZhciB0b3RhbExlbmd0aCA9IGluZGVudGF0aW9uLmxlbmd0aCwgcmVzdWx0O1xuICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgYXJyYXkgZWxlbWVudHMuXG4gICAgICAgICAgICAgIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IHNlcmlhbGl6ZShpbmRleCwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbixcbiAgICAgICAgICAgICAgICAgIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50ID09PSB1bmRlZiA/IFwibnVsbFwiIDogZWxlbWVudDtcbiAgICAgICAgICAgICAgICB0b3RhbExlbmd0aCArPSByZXN1bHQubGVuZ3RoICsgKGluZGV4ID4gMCA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHRzLmxlbmd0aCA/XG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZSAmJiAodG90YWxMZW5ndGggPiBtYXhMaW5lTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgICBcIltcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwiXVwiIDpcbiAgICAgICAgICAgICAgICAgIFwiW1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwiXVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIDogXCJbXVwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gaW5kZW50YXRpb24ubGVuZ3RoLCBpbmRleD0wO1xuICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgb2JqZWN0IG1lbWJlcnMuIE1lbWJlcnMgYXJlIHNlbGVjdGVkIGZyb21cbiAgICAgICAgICAgICAgLy8gZWl0aGVyIGEgdXNlci1zcGVjaWZpZWQgbGlzdCBvZiBwcm9wZXJ0eSBuYW1lcywgb3IgdGhlIG9iamVjdFxuICAgICAgICAgICAgICAvLyBpdHNlbGYuXG4gICAgICAgICAgICAgIGZvckVhY2gocHJvcGVydGllcyB8fCB2YWx1ZSwgZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCwgZWxlbWVudCA9IHNlcmlhbGl6ZShwcm9wZXJ0eSwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjaywgbWF4TGluZUxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCAhPT0gdW5kZWYpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEFjY29yZGluZyB0byBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zOiBcIklmIGBnYXBgIHt3aGl0ZXNwYWNlfVxuICAgICAgICAgICAgICAgICAgLy8gaXMgbm90IHRoZSBlbXB0eSBzdHJpbmcsIGxldCBgbWVtYmVyYCB7cXVvdGUocHJvcGVydHkpICsgXCI6XCJ9XG4gICAgICAgICAgICAgICAgICAvLyBiZSB0aGUgY29uY2F0ZW5hdGlvbiBvZiBgbWVtYmVyYCBhbmQgdGhlIGBzcGFjZWAgY2hhcmFjdGVyLlwiXG4gICAgICAgICAgICAgICAgICAvLyBUaGUgXCJgc3BhY2VgIGNoYXJhY3RlclwiIHJlZmVycyB0byB0aGUgbGl0ZXJhbCBzcGFjZVxuICAgICAgICAgICAgICAgICAgLy8gY2hhcmFjdGVyLCBub3QgdGhlIGBzcGFjZWAge3dpZHRofSBhcmd1bWVudCBwcm92aWRlZCB0b1xuICAgICAgICAgICAgICAgICAgLy8gYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHF1b3RlKHByb3BlcnR5KSArIFwiOlwiICsgKHdoaXRlc3BhY2UgPyBcIiBcIiA6IFwiXCIpICsgZWxlbWVudDtcbiAgICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IHJlc3VsdC5sZW5ndGggKyAoaW5kZXgrKyA+IDAgPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHRzLmxlbmd0aCA/XG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZSAmJiAodG90YWxMZW5ndGggPiBtYXhMaW5lTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgICBcIntcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwifVwiIDpcbiAgICAgICAgICAgICAgICAgIFwie1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwifVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIDogXCJ7fVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBvYmplY3QgZnJvbSB0aGUgdHJhdmVyc2VkIG9iamVjdCBzdGFjay5cbiAgICAgICAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUHVibGljOiBgSlNPTi5zdHJpbmdpZnlgLiBTZWUgRVMgNS4xIHNlY3Rpb24gMTUuMTIuMy5cblxuICAgICAgICBleHBvcnRzLnN0cmluZ2lmeSA9IGZ1bmN0aW9uIChzb3VyY2UsIGZpbHRlciwgd2lkdGgsIG1heExpbmVMZW5ndGgpIHtcbiAgICAgICAgICB2YXIgd2hpdGVzcGFjZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIGNsYXNzTmFtZTtcbiAgICAgICAgICBpZiAob2JqZWN0VHlwZXNbdHlwZW9mIGZpbHRlcl0gJiYgZmlsdGVyKSB7XG4gICAgICAgICAgICBpZiAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwoZmlsdGVyKSkgPT0gZnVuY3Rpb25DbGFzcykge1xuICAgICAgICAgICAgICBjYWxsYmFjayA9IGZpbHRlcjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgcHJvcGVydHkgbmFtZXMgYXJyYXkgaW50byBhIG1ha2VzaGlmdCBzZXQuXG4gICAgICAgICAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwLCBsZW5ndGggPSBmaWx0ZXIubGVuZ3RoLCB2YWx1ZTsgaW5kZXggPCBsZW5ndGg7IHZhbHVlID0gZmlsdGVyW2luZGV4KytdLCAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpKSwgY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzIHx8IGNsYXNzTmFtZSA9PSBudW1iZXJDbGFzcykgJiYgKHByb3BlcnRpZXNbdmFsdWVdID0gMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAod2lkdGgpIHtcbiAgICAgICAgICAgIGlmICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh3aWR0aCkpID09IG51bWJlckNsYXNzKSB7XG4gICAgICAgICAgICAgIC8vIENvbnZlcnQgdGhlIGB3aWR0aGAgdG8gYW4gaW50ZWdlciBhbmQgY3JlYXRlIGEgc3RyaW5nIGNvbnRhaW5pbmdcbiAgICAgICAgICAgICAgLy8gYHdpZHRoYCBudW1iZXIgb2Ygc3BhY2UgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgaWYgKCh3aWR0aCAtPSB3aWR0aCAlIDEpID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAod2hpdGVzcGFjZSA9IFwiXCIsIHdpZHRoID4gMTAgJiYgKHdpZHRoID0gMTApOyB3aGl0ZXNwYWNlLmxlbmd0aCA8IHdpZHRoOyB3aGl0ZXNwYWNlICs9IFwiIFwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MpIHtcbiAgICAgICAgICAgICAgd2hpdGVzcGFjZSA9IHdpZHRoLmxlbmd0aCA8PSAxMCA/IHdpZHRoIDogd2lkdGguc2xpY2UoMCwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPcGVyYSA8PSA3LjU0dTIgZGlzY2FyZHMgdGhlIHZhbHVlcyBhc3NvY2lhdGVkIHdpdGggZW1wdHkgc3RyaW5nIGtleXNcbiAgICAgICAgICAvLyAoYFwiXCJgKSBvbmx5IGlmIHRoZXkgYXJlIHVzZWQgZGlyZWN0bHkgd2l0aGluIGFuIG9iamVjdCBtZW1iZXIgbGlzdFxuICAgICAgICAgIC8vIChlLmcuLCBgIShcIlwiIGluIHsgXCJcIjogMX0pYCkuXG4gICAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZShcIlwiLCAodmFsdWUgPSB7fSwgdmFsdWVbXCJcIl0gPSBzb3VyY2UsIHZhbHVlKSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIFwiXCIsIFtdLCBtYXhMaW5lTGVuZ3RoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBleHBvcnRzLmNvbXBhY3RTdHJpbmdpZnkgPSBmdW5jdGlvbiAoc291cmNlLCBmaWx0ZXIsIHdpZHRoKXtcbiAgICAgICAgICByZXR1cm4gZXhwb3J0cy5zdHJpbmdpZnkoc291cmNlLCBmaWx0ZXIsIHdpZHRoLCA2MCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUHVibGljOiBQYXJzZXMgYSBKU09OIHNvdXJjZSBzdHJpbmcuXG4gICAgICBpZiAoIWhhcyhcImpzb24tcGFyc2VcIikpIHtcbiAgICAgICAgdmFyIGZyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IEEgbWFwIG9mIGVzY2FwZWQgY29udHJvbCBjaGFyYWN0ZXJzIGFuZCB0aGVpciB1bmVzY2FwZWRcbiAgICAgICAgLy8gZXF1aXZhbGVudHMuXG4gICAgICAgIHZhciBVbmVzY2FwZXMgPSB7XG4gICAgICAgICAgOTI6IFwiXFxcXFwiLFxuICAgICAgICAgIDM0OiAnXCInLFxuICAgICAgICAgIDQ3OiBcIi9cIixcbiAgICAgICAgICA5ODogXCJcXGJcIixcbiAgICAgICAgICAxMTY6IFwiXFx0XCIsXG4gICAgICAgICAgMTEwOiBcIlxcblwiLFxuICAgICAgICAgIDEwMjogXCJcXGZcIixcbiAgICAgICAgICAxMTQ6IFwiXFxyXCJcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogU3RvcmVzIHRoZSBwYXJzZXIgc3RhdGUuXG4gICAgICAgIHZhciBJbmRleCwgU291cmNlO1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZXNldHMgdGhlIHBhcnNlciBzdGF0ZSBhbmQgdGhyb3dzIGEgYFN5bnRheEVycm9yYC5cbiAgICAgICAgdmFyIGFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIEluZGV4ID0gU291cmNlID0gbnVsbDtcbiAgICAgICAgICB0aHJvdyBTeW50YXhFcnJvcigpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZXR1cm5zIHRoZSBuZXh0IHRva2VuLCBvciBgXCIkXCJgIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWRcbiAgICAgICAgLy8gdGhlIGVuZCBvZiB0aGUgc291cmNlIHN0cmluZy4gQSB0b2tlbiBtYXkgYmUgYSBzdHJpbmcsIG51bWJlciwgYG51bGxgXG4gICAgICAgIC8vIGxpdGVyYWwsIG9yIEJvb2xlYW4gbGl0ZXJhbC5cbiAgICAgICAgdmFyIGxleCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgc291cmNlID0gU291cmNlLCBsZW5ndGggPSBzb3VyY2UubGVuZ3RoLCB2YWx1ZSwgYmVnaW4sIHBvc2l0aW9uLCBpc1NpZ25lZCwgY2hhckNvZGU7XG4gICAgICAgICAgd2hpbGUgKEluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgY2FzZSA5OiBjYXNlIDEwOiBjYXNlIDEzOiBjYXNlIDMyOlxuICAgICAgICAgICAgICAgIC8vIFNraXAgd2hpdGVzcGFjZSB0b2tlbnMsIGluY2x1ZGluZyB0YWJzLCBjYXJyaWFnZSByZXR1cm5zLCBsaW5lXG4gICAgICAgICAgICAgICAgLy8gZmVlZHMsIGFuZCBzcGFjZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgMTIzOiBjYXNlIDEyNTogY2FzZSA5MTogY2FzZSA5MzogY2FzZSA1ODogY2FzZSA0NDpcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBhIHB1bmN0dWF0b3IgdG9rZW4gKGB7YCwgYH1gLCBgW2AsIGBdYCwgYDpgLCBvciBgLGApIGF0XG4gICAgICAgICAgICAgICAgLy8gdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBjaGFySW5kZXhCdWdneSA/IHNvdXJjZS5jaGFyQXQoSW5kZXgpIDogc291cmNlW0luZGV4XTtcbiAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgY2FzZSAzNDpcbiAgICAgICAgICAgICAgICAvLyBgXCJgIGRlbGltaXRzIGEgSlNPTiBzdHJpbmc7IGFkdmFuY2UgdG8gdGhlIG5leHQgY2hhcmFjdGVyIGFuZFxuICAgICAgICAgICAgICAgIC8vIGJlZ2luIHBhcnNpbmcgdGhlIHN0cmluZy4gU3RyaW5nIHRva2VucyBhcmUgcHJlZml4ZWQgd2l0aCB0aGVcbiAgICAgICAgICAgICAgICAvLyBzZW50aW5lbCBgQGAgY2hhcmFjdGVyIHRvIGRpc3Rpbmd1aXNoIHRoZW0gZnJvbSBwdW5jdHVhdG9ycyBhbmRcbiAgICAgICAgICAgICAgICAvLyBlbmQtb2Ytc3RyaW5nIHRva2Vucy5cbiAgICAgICAgICAgICAgICBmb3IgKHZhbHVlID0gXCJAXCIsIEluZGV4Kys7IEluZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPCAzMikge1xuICAgICAgICAgICAgICAgICAgICAvLyBVbmVzY2FwZWQgQVNDSUkgY29udHJvbCBjaGFyYWN0ZXJzICh0aG9zZSB3aXRoIGEgY29kZSB1bml0XG4gICAgICAgICAgICAgICAgICAgIC8vIGxlc3MgdGhhbiB0aGUgc3BhY2UgY2hhcmFjdGVyKSBhcmUgbm90IHBlcm1pdHRlZC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhckNvZGUgPT0gOTIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSByZXZlcnNlIHNvbGlkdXMgKGBcXGApIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgYW4gZXNjYXBlZFxuICAgICAgICAgICAgICAgICAgICAvLyBjb250cm9sIGNoYXJhY3RlciAoaW5jbHVkaW5nIGBcImAsIGBcXGAsIGFuZCBgL2ApIG9yIFVuaWNvZGVcbiAgICAgICAgICAgICAgICAgICAgLy8gZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSA5MjogY2FzZSAzNDogY2FzZSA0NzogY2FzZSA5ODogY2FzZSAxMTY6IGNhc2UgMTEwOiBjYXNlIDEwMjogY2FzZSAxMTQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZpdmUgZXNjYXBlZCBjb250cm9sIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBVbmVzY2FwZXNbY2hhckNvZGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTE3OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYFxcdWAgbWFya3MgdGhlIGJlZ2lubmluZyBvZiBhIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWR2YW5jZSB0byB0aGUgZmlyc3QgY2hhcmFjdGVyIGFuZCB2YWxpZGF0ZSB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgY29kZSBwb2ludC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJlZ2luID0gKytJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleCArIDQ7IEluZGV4IDwgcG9zaXRpb247IEluZGV4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEEgdmFsaWQgc2VxdWVuY2UgY29tcHJpc2VzIGZvdXIgaGV4ZGlnaXRzIChjYXNlLVxuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbnNlbnNpdGl2ZSkgdGhhdCBmb3JtIGEgc2luZ2xlIGhleGFkZWNpbWFsIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1NyB8fCBjaGFyQ29kZSA+PSA5NyAmJiBjaGFyQ29kZSA8PSAxMDIgfHwgY2hhckNvZGUgPj0gNjUgJiYgY2hhckNvZGUgPD0gNzApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZpdmUgdGhlIGVzY2FwZWQgY2hhcmFjdGVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gZnJvbUNoYXJDb2RlKFwiMHhcIiArIHNvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSAzNCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEFuIHVuZXNjYXBlZCBkb3VibGUtcXVvdGUgY2hhcmFjdGVyIG1hcmtzIHRoZSBlbmQgb2YgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgLy8gc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBiZWdpbiA9IEluZGV4O1xuICAgICAgICAgICAgICAgICAgICAvLyBPcHRpbWl6ZSBmb3IgdGhlIGNvbW1vbiBjYXNlIHdoZXJlIGEgc3RyaW5nIGlzIHZhbGlkLlxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoY2hhckNvZGUgPj0gMzIgJiYgY2hhckNvZGUgIT0gOTIgJiYgY2hhckNvZGUgIT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGVuZCB0aGUgc3RyaW5nIGFzLWlzLlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSA9PSAzNCkge1xuICAgICAgICAgICAgICAgICAgLy8gQWR2YW5jZSB0byB0aGUgbmV4dCBjaGFyYWN0ZXIgYW5kIHJldHVybiB0aGUgcmV2aXZlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVbnRlcm1pbmF0ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgbnVtYmVycyBhbmQgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgYmVnaW4gPSBJbmRleDtcbiAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHBhc3QgdGhlIG5lZ2F0aXZlIHNpZ24sIGlmIG9uZSBpcyBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQ1KSB7XG4gICAgICAgICAgICAgICAgICBpc1NpZ25lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBhbiBpbnRlZ2VyIG9yIGZsb2F0aW5nLXBvaW50IHZhbHVlLlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nykge1xuICAgICAgICAgICAgICAgICAgLy8gTGVhZGluZyB6ZXJvZXMgYXJlIGludGVycHJldGVkIGFzIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQ4ICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCArIDEpKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgb2N0YWwgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlzU2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgaW50ZWdlciBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICBmb3IgKDsgSW5kZXggPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgSW5kZXgrKyk7XG4gICAgICAgICAgICAgICAgICAvLyBGbG9hdHMgY2Fubm90IGNvbnRhaW4gYSBsZWFkaW5nIGRlY2ltYWwgcG9pbnQ7IGhvd2V2ZXIsIHRoaXNcbiAgICAgICAgICAgICAgICAgIC8vIGNhc2UgaXMgYWxyZWFkeSBhY2NvdW50ZWQgZm9yIGJ5IHRoZSBwYXJzZXIuXG4gICAgICAgICAgICAgICAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpID09IDQ2KSB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gKytJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGRlY2ltYWwgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgICBmb3IgKDsgcG9zaXRpb24gPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KHBvc2l0aW9uKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgcG9zaXRpb24rKyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgdHJhaWxpbmcgZGVjaW1hbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEluZGV4ID0gcG9zaXRpb247XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBQYXJzZSBleHBvbmVudHMuIFRoZSBgZWAgZGVub3RpbmcgdGhlIGV4cG9uZW50IGlzXG4gICAgICAgICAgICAgICAgICAvLyBjYXNlLWluc2Vuc2l0aXZlLlxuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gMTAxIHx8IGNoYXJDb2RlID09IDY5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNraXAgcGFzdCB0aGUgc2lnbiBmb2xsb3dpbmcgdGhlIGV4cG9uZW50LCBpZiBvbmUgaXNcbiAgICAgICAgICAgICAgICAgICAgLy8gc3BlY2lmaWVkLlxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDMgfHwgY2hhckNvZGUgPT0gNDUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBleHBvbmVudGlhbCBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleDsgcG9zaXRpb24gPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KHBvc2l0aW9uKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgcG9zaXRpb24rKyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgZW1wdHkgZXhwb25lbnQuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBJbmRleCA9IHBvc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gQ29lcmNlIHRoZSBwYXJzZWQgdmFsdWUgdG8gYSBKYXZhU2NyaXB0IG51bWJlci5cbiAgICAgICAgICAgICAgICAgIHJldHVybiArc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEEgbmVnYXRpdmUgc2lnbiBtYXkgb25seSBwcmVjZWRlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgaWYgKGlzU2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBgdHJ1ZWAsIGBmYWxzZWAsIGFuZCBgbnVsbGAgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA0KSA9PSBcInRydWVcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDUpID09IFwiZmFsc2VcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA0KSA9PSBcIm51bGxcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVbnJlY29nbml6ZWQgdG9rZW4uXG4gICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmV0dXJuIHRoZSBzZW50aW5lbCBgJGAgY2hhcmFjdGVyIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWQgdGhlIGVuZFxuICAgICAgICAgIC8vIG9mIHRoZSBzb3VyY2Ugc3RyaW5nLlxuICAgICAgICAgIHJldHVybiBcIiRcIjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUGFyc2VzIGEgSlNPTiBgdmFsdWVgIHRva2VuLlxuICAgICAgICB2YXIgZ2V0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdHMsIGhhc01lbWJlcnM7XG4gICAgICAgICAgaWYgKHZhbHVlID09IFwiJFwiKSB7XG4gICAgICAgICAgICAvLyBVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dC5cbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgaWYgKChjaGFySW5kZXhCdWdneSA/IHZhbHVlLmNoYXJBdCgwKSA6IHZhbHVlWzBdKSA9PSBcIkBcIikge1xuICAgICAgICAgICAgICAvLyBSZW1vdmUgdGhlIHNlbnRpbmVsIGBAYCBjaGFyYWN0ZXIuXG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5zbGljZSgxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFBhcnNlIG9iamVjdCBhbmQgYXJyYXkgbGl0ZXJhbHMuXG4gICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJbXCIpIHtcbiAgICAgICAgICAgICAgLy8gUGFyc2VzIGEgSlNPTiBhcnJheSwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgYXJyYXkuXG4gICAgICAgICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgICAgZm9yICg7OyBoYXNNZW1iZXJzIHx8IChoYXNNZW1iZXJzID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgIC8vIEEgY2xvc2luZyBzcXVhcmUgYnJhY2tldCBtYXJrcyB0aGUgZW5kIG9mIHRoZSBhcnJheSBsaXRlcmFsLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIl1cIikge1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBhcnJheSBsaXRlcmFsIGNvbnRhaW5zIGVsZW1lbnRzLCB0aGUgY3VycmVudCB0b2tlblxuICAgICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhIGNvbW1hIHNlcGFyYXRpbmcgdGhlIHByZXZpb3VzIGVsZW1lbnQgZnJvbSB0aGVcbiAgICAgICAgICAgICAgICAvLyBuZXh0LlxuICAgICAgICAgICAgICAgIGlmIChoYXNNZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiXVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gYXJyYXkgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIGAsYCBtdXN0IHNlcGFyYXRlIGVhY2ggYXJyYXkgZWxlbWVudC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRWxpc2lvbnMgYW5kIGxlYWRpbmcgY29tbWFzIGFyZSBub3QgcGVybWl0dGVkLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGdldCh2YWx1ZSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PSBcIntcIikge1xuICAgICAgICAgICAgICAvLyBQYXJzZXMgYSBKU09OIG9iamVjdCwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgb2JqZWN0LlxuICAgICAgICAgICAgICByZXN1bHRzID0ge307XG4gICAgICAgICAgICAgIGZvciAoOzsgaGFzTWVtYmVycyB8fCAoaGFzTWVtYmVycyA9IHRydWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAvLyBBIGNsb3NpbmcgY3VybHkgYnJhY2UgbWFya3MgdGhlIGVuZCBvZiB0aGUgb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIG9iamVjdCBsaXRlcmFsIGNvbnRhaW5zIG1lbWJlcnMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgICAgICAgLy8gc2hvdWxkIGJlIGEgY29tbWEgc2VwYXJhdG9yLlxuICAgICAgICAgICAgICAgIGlmIChoYXNNZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSBgLGAgbXVzdCBzZXBhcmF0ZSBlYWNoIG9iamVjdCBtZW1iZXIuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIExlYWRpbmcgY29tbWFzIGFyZSBub3QgcGVybWl0dGVkLCBvYmplY3QgcHJvcGVydHkgbmFtZXMgbXVzdCBiZVxuICAgICAgICAgICAgICAgIC8vIGRvdWJsZS1xdW90ZWQgc3RyaW5ncywgYW5kIGEgYDpgIG11c3Qgc2VwYXJhdGUgZWFjaCBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgIC8vIG5hbWUgYW5kIHZhbHVlLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIiB8fCB0eXBlb2YgdmFsdWUgIT0gXCJzdHJpbmdcIiB8fCAoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5jaGFyQXQoMCkgOiB2YWx1ZVswXSkgIT0gXCJAXCIgfHwgbGV4KCkgIT0gXCI6XCIpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHNbdmFsdWUuc2xpY2UoMSldID0gZ2V0KGxleCgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdG9rZW4gZW5jb3VudGVyZWQuXG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFVwZGF0ZXMgYSB0cmF2ZXJzZWQgb2JqZWN0IG1lbWJlci5cbiAgICAgICAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uIChzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciBlbGVtZW50ID0gd2Fsayhzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgICAgaWYgKGVsZW1lbnQgPT09IHVuZGVmKSB7XG4gICAgICAgICAgICBkZWxldGUgc291cmNlW3Byb3BlcnR5XTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc291cmNlW3Byb3BlcnR5XSA9IGVsZW1lbnQ7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZWN1cnNpdmVseSB0cmF2ZXJzZXMgYSBwYXJzZWQgSlNPTiBvYmplY3QsIGludm9raW5nIHRoZVxuICAgICAgICAvLyBgY2FsbGJhY2tgIGZ1bmN0aW9uIGZvciBlYWNoIHZhbHVlLiBUaGlzIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZVxuICAgICAgICAvLyBgV2Fsayhob2xkZXIsIG5hbWUpYCBvcGVyYXRpb24gZGVmaW5lZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS4xMi4yLlxuICAgICAgICB2YXIgd2FsayA9IGZ1bmN0aW9uIChzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciB2YWx1ZSA9IHNvdXJjZVtwcm9wZXJ0eV0sIGxlbmd0aDtcbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGBmb3JFYWNoYCBjYW4ndCBiZSB1c2VkIHRvIHRyYXZlcnNlIGFuIGFycmF5IGluIE9wZXJhIDw9IDguNTRcbiAgICAgICAgICAgIC8vIGJlY2F1c2UgaXRzIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIGltcGxlbWVudGF0aW9uIHJldHVybnMgYGZhbHNlYFxuICAgICAgICAgICAgLy8gZm9yIGFycmF5IGluZGljZXMgKGUuZy4sIGAhWzEsIDIsIDNdLmhhc093blByb3BlcnR5KFwiMFwiKWApLlxuICAgICAgICAgICAgaWYgKGdldENsYXNzLmNhbGwodmFsdWUpID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgZm9yIChsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGxlbmd0aC0tOykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSh2YWx1ZSwgbGVuZ3RoLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvckVhY2godmFsdWUsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSh2YWx1ZSwgcHJvcGVydHksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKHNvdXJjZSwgcHJvcGVydHksIHZhbHVlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQdWJsaWM6IGBKU09OLnBhcnNlYC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjIuXG4gICAgICAgIGV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoc291cmNlLCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciByZXN1bHQsIHZhbHVlO1xuICAgICAgICAgIEluZGV4ID0gMDtcbiAgICAgICAgICBTb3VyY2UgPSBcIlwiICsgc291cmNlO1xuICAgICAgICAgIHJlc3VsdCA9IGdldChsZXgoKSk7XG4gICAgICAgICAgLy8gSWYgYSBKU09OIHN0cmluZyBjb250YWlucyBtdWx0aXBsZSB0b2tlbnMsIGl0IGlzIGludmFsaWQuXG4gICAgICAgICAgaWYgKGxleCgpICE9IFwiJFwiKSB7XG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZXNldCB0aGUgcGFyc2VyIHN0YXRlLlxuICAgICAgICAgIEluZGV4ID0gU291cmNlID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sgJiYgZ2V0Q2xhc3MuY2FsbChjYWxsYmFjaykgPT0gZnVuY3Rpb25DbGFzcyA/IHdhbGsoKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gcmVzdWx0LCB2YWx1ZSksIFwiXCIsIGNhbGxiYWNrKSA6IHJlc3VsdDtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBleHBvcnRzW1wicnVuSW5Db250ZXh0XCJdID0gcnVuSW5Db250ZXh0O1xuICAgIHJldHVybiBleHBvcnRzO1xuICB9XG5cbiAgaWYgKGZyZWVFeHBvcnRzICYmICFpc0xvYWRlcikge1xuICAgIC8vIEV4cG9ydCBmb3IgQ29tbW9uSlMgZW52aXJvbm1lbnRzLlxuICAgIHJ1bkluQ29udGV4dChyb290LCBmcmVlRXhwb3J0cyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gRXhwb3J0IGZvciB3ZWIgYnJvd3NlcnMgYW5kIEphdmFTY3JpcHQgZW5naW5lcy5cbiAgICB2YXIgbmF0aXZlSlNPTiA9IHJvb3QuSlNPTixcbiAgICAgICAgcHJldmlvdXNKU09OID0gcm9vdFtcIkpTT04zXCJdLFxuICAgICAgICBpc1Jlc3RvcmVkID0gZmFsc2U7XG5cbiAgICB2YXIgSlNPTjMgPSBydW5JbkNvbnRleHQocm9vdCwgKHJvb3RbXCJKU09OM1wiXSA9IHtcbiAgICAgIC8vIFB1YmxpYzogUmVzdG9yZXMgdGhlIG9yaWdpbmFsIHZhbHVlIG9mIHRoZSBnbG9iYWwgYEpTT05gIG9iamVjdCBhbmRcbiAgICAgIC8vIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGBKU09OM2Agb2JqZWN0LlxuICAgICAgXCJub0NvbmZsaWN0XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFpc1Jlc3RvcmVkKSB7XG4gICAgICAgICAgaXNSZXN0b3JlZCA9IHRydWU7XG4gICAgICAgICAgcm9vdC5KU09OID0gbmF0aXZlSlNPTjtcbiAgICAgICAgICByb290W1wiSlNPTjNcIl0gPSBwcmV2aW91c0pTT047XG4gICAgICAgICAgbmF0aXZlSlNPTiA9IHByZXZpb3VzSlNPTiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEpTT04zO1xuICAgICAgfVxuICAgIH0pKTtcblxuICAgIHJvb3QuSlNPTiA9IHtcbiAgICAgIFwicGFyc2VcIjogSlNPTjMucGFyc2UsXG4gICAgICBcInN0cmluZ2lmeVwiOiBKU09OMy5zdHJpbmdpZnlcbiAgICB9O1xuICB9XG5cbiAgLy8gRXhwb3J0IGZvciBhc3luY2hyb25vdXMgbW9kdWxlIGxvYWRlcnMuXG4gIGlmIChpc0xvYWRlcikge1xuICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gSlNPTjM7XG4gICAgfSk7XG4gIH1cbn0pLmNhbGwodGhpcyk7XG4iLCIndXNlIHN0cmljdCc7XG4vKiBnbG9iYWxzIHdpbmRvdywgYW5ndWxhciAqL1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScsIFtcbiAgICAnTG9jYWxTdG9yYWdlTW9kdWxlJyxcbiAgICAnYW5ndWxhci1nb29nbGUtYW5hbHl0aWNzJ1xuICBdKVxuICAuY29uc3RhbnQoJ18nLCB3aW5kb3cuXylcbiAgLy8gZGF0YWxpYiwgdmVnYWxpdGUsIHZlZ2FcbiAgLmNvbnN0YW50KCdkbCcsIHdpbmRvdy5kbClcbiAgLmNvbnN0YW50KCd2bCcsIHdpbmRvdy52bClcbiAgLmNvbnN0YW50KCd2ZycsIHdpbmRvdy52ZylcbiAgLy8gb3RoZXIgbGlicmFyaWVzXG4gIC5jb25zdGFudCgnQmxvYicsIHdpbmRvdy5CbG9iKVxuICAuY29uc3RhbnQoJ1VSTCcsIHdpbmRvdy5VUkwpXG4gIC5jb25zdGFudCgnRHJvcCcsIHdpbmRvdy5Ecm9wKVxuICAuY29uc3RhbnQoJ0hlYXAnLCB3aW5kb3cuSGVhcClcbiAgLy8gVXNlIHRoZSBjdXN0b21pemVkIHZlbmRvci9qc29uMy1jb21wYWN0c3RyaW5naWZ5XG4gIC5jb25zdGFudCgnSlNPTjMnLCB3aW5kb3cuSlNPTjMubm9Db25mbGljdCgpKVxuICAvLyBjb25zdGFudHNcbiAgLmNvbnN0YW50KCdjb25zdHMnLCB7XG4gICAgYWRkQ291bnQ6IHRydWUsIC8vIGFkZCBjb3VudCBmaWVsZCB0byBEYXRhc2V0LmRhdGFzY2hlbWFcbiAgICBkZWJ1ZzogdHJ1ZSxcbiAgICB1c2VVcmw6IHRydWUsXG4gICAgbG9nZ2luZzogdHJ1ZSxcbiAgICBkZWZhdWx0Q29uZmlnU2V0OiAnbGFyZ2UnLFxuICAgIGFwcElkOiAndmx1aScsXG4gICAgLy8gZW1iZWRkZWQgcG9sZXN0YXIgYW5kIHZveWFnZXIgd2l0aCBrbm93biBkYXRhXG4gICAgZW1iZWRkZWREYXRhOiB3aW5kb3cudmd1aURhdGEgfHwgdW5kZWZpbmVkLFxuICAgIHByaW9yaXR5OiB7XG4gICAgICBib29rbWFyazogMCxcbiAgICAgIHBvcHVwOiAwLFxuICAgICAgdmlzbGlzdDogMTAwMFxuICAgIH0sXG4gICAgbXlyaWFSZXN0OiAnaHR0cDovL2VjMi01Mi0xLTM4LTE4Mi5jb21wdXRlLTEuYW1hem9uYXdzLmNvbTo4NzUzJyxcbiAgICBkZWZhdWx0VGltZUZuOiAneWVhcicsXG4gICAgdHlwZU5hbWVzOiB7XG4gICAgICBub21pbmFsOiAndGV4dCcsXG4gICAgICBvcmRpbmFsOiAndGV4dC1vcmRpbmFsJyxcbiAgICAgIHF1YW50aXRhdGl2ZTogJ251bWJlcicsXG4gICAgICB0ZW1wb3JhbDogJ3RpbWUnLFxuICAgICAgZ2VvZ3JhcGhpYzogJ2dlbydcbiAgICB9XG4gIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoXCJ2bHVpXCIpLnJ1bihbXCIkdGVtcGxhdGVDYWNoZVwiLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dChcImFsZXJ0bWVzc2FnZXMvYWxlcnRtZXNzYWdlcy5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhbGVydC1ib3hcXFwiIG5nLXNob3c9XFxcIkFsZXJ0cy5hbGVydHMubGVuZ3RoID4gMFxcXCI+PGRpdiBjbGFzcz1cXFwiYWxlcnQtaXRlbVxcXCIgbmctcmVwZWF0PVxcXCJhbGVydCBpbiBBbGVydHMuYWxlcnRzXFxcIj57eyBhbGVydC5tc2cgfX0gPGEgY2xhc3M9XFxcImNsb3NlXFxcIiBuZy1jbGljaz1cXFwiQWxlcnRzLmNsb3NlQWxlcnQoJGluZGV4KVxcXCI+JnRpbWVzOzwvYT48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWxcIixcIjxtb2RhbCBpZD1cXFwiYm9va21hcmstbGlzdFxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5pc1N1cHBvcnRlZFxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtaGVhZGVyIGNhcmQgbm8tdG9wLW1hcmdpbiBuby1yaWdodC1tYXJnaW5cXFwiPjxtb2RhbC1jbG9zZS1idXR0b24gb24tY2xvc2U9XFxcImxvZ0Jvb2ttYXJrc0Nsb3NlZCgpXFxcIj48L21vZGFsLWNsb3NlLWJ1dHRvbj48aDIgY2xhc3M9XFxcIm5vLWJvdHRvbS1tYXJnaW5cXFwiPkJvb2ttYXJrcyAoe3sgQm9va21hcmtzLmxlbmd0aCB9fSk8L2gyPjxhIG5nLWNsaWNrPVxcXCJCb29rbWFya3MuY2xlYXIoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoLW9cXFwiPjwvaT4gQ2xlYXIgYWxsPC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZsZXgtZ3Jvdy0xIHNjcm9sbC15XFxcIj48ZGl2IG5nLWlmPVxcXCJCb29rbWFya3MubGVuZ3RoID4gMFxcXCIgY2xhc3M9XFxcImhmbGV4IGZsZXgtd3JhcFxcXCI+PHZsLXBsb3QtZ3JvdXAgbmctcmVwZWF0PVxcXCJjaGFydCBpbiBCb29rbWFya3MuZGljdCB8IG9yZGVyT2JqZWN0QnkgOiBcXCd0aW1lQWRkZWRcXCcgOiBmYWxzZVxcXCIgY2xhc3M9XFxcIndyYXBwZWQtdmwtcGxvdC1ncm91cCBjYXJkXFxcIiBjaGFydD1cXFwiY2hhcnRcXFwiIGZpZWxkLXNldD1cXFwiY2hhcnQuZmllbGRTZXRcXFwiIHNob3ctYm9va21hcms9XFxcInRydWVcXFwiIHNob3ctZGVidWc9XFxcImNvbnN0cy5kZWJ1Z1xcXCIgc2hvdy1leHBhbmQ9XFxcImZhbHNlXFxcIiBhbHdheXMtc2VsZWN0ZWQ9XFxcInRydWVcXFwiIGhpZ2hsaWdodGVkPVxcXCJoaWdobGlnaHRlZFxcXCIgb3ZlcmZsb3c9XFxcInRydWVcXFwiIHRvb2x0aXA9XFxcInRydWVcXFwiIHByaW9yaXR5PVxcXCJjb25zdHMucHJpb3JpdHkuYm9va21hcmtcXFwiPjwvdmwtcGxvdC1ncm91cD48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ2aXMtbGlzdC1lbXB0eVxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5sZW5ndGggPT09IDBcXFwiPllvdSBoYXZlIG5vIGJvb2ttYXJrczwvZGl2PjwvZGl2PjwvbW9kYWw+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWRkLW15cmlhLWRhdGFzZXRcXFwiPjxwPlNlbGVjdCBhIGRhdGFzZXQgZnJvbSB0aGUgTXlyaWEgaW5zdGFuY2UgYXQgPGlucHV0IG5nLW1vZGVsPVxcXCJteXJpYVJlc3RVcmxcXFwiPjxidXR0b24gbmctY2xpY2s9XFxcImxvYWREYXRhc2V0cyhcXCdcXCcpXFxcIj51cGRhdGU8L2J1dHRvbj4uPC9wPjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRGF0YXNldChteXJpYURhdGFzZXQpXFxcIj48ZGl2PjxzZWxlY3QgbmFtZT1cXFwibXlyaWEtZGF0YXNldFxcXCIgaWQ9XFxcInNlbGVjdC1teXJpYS1kYXRhc2V0XFxcIiBuZy1kaXNhYmxlZD1cXFwiZGlzYWJsZWRcXFwiIG5nLW1vZGVsPVxcXCJteXJpYURhdGFzZXRcXFwiIG5nLW9wdGlvbnM9XFxcIm9wdGlvbk5hbWUoZGF0YXNldCkgZm9yIGRhdGFzZXQgaW4gbXlyaWFEYXRhc2V0cyB0cmFjayBieSBkYXRhc2V0LnJlbGF0aW9uTmFtZVxcXCI+PG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj5TZWxlY3QgRGF0YXNldC4uLjwvb3B0aW9uPjwvc2VsZWN0PjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YXNldDwvYnV0dG9uPjwvZm9ybT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2FkZHVybGRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWRkLXVybC1kYXRhc2V0XFxcIj48cD5BZGQgdGhlIG5hbWUgb2YgdGhlIGRhdGFzZXQgYW5kIHRoZSBVUkwgdG8gYSA8Yj5KU09OPC9iPiBvciA8Yj5DU1Y8L2I+ICh3aXRoIGhlYWRlcikgZmlsZS4gTWFrZSBzdXJlIHRoYXQgdGhlIGZvcm1hdHRpbmcgaXMgY29ycmVjdCBhbmQgY2xlYW4gdGhlIGRhdGEgYmVmb3JlIGFkZGluZyBpdC4gVGhlIGFkZGVkIGRhdGFzZXQgaXMgb25seSB2aXNpYmxlIHRvIHlvdS48L3A+PGZvcm0gbmctc3VibWl0PVxcXCJhZGRGcm9tVXJsKGFkZGVkRGF0YXNldClcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtbmFtZVxcXCI+TmFtZTwvbGFiZWw+IDxpbnB1dCBuZy1tb2RlbD1cXFwiYWRkZWREYXRhc2V0Lm5hbWVcXFwiIGlkPVxcXCJkYXRhc2V0LW5hbWVcXFwiIHR5cGU9XFxcInRleHRcXFwiPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtdXJsXFxcIj5VUkw8L2xhYmVsPiA8aW5wdXQgbmctbW9kZWw9XFxcImFkZGVkRGF0YXNldC51cmxcXFwiIGlkPVxcXCJkYXRhc2V0LXVybFxcXCIgdHlwZT1cXFwidXJsXFxcIj48cD5NYWtlIHN1cmUgdGhhdCB5b3UgaG9zdCB0aGUgZmlsZSBvbiBhIHNlcnZlciB0aGF0IGhhcyA8Y29kZT5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW46ICo8L2NvZGU+IHNldC48L3A+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhc2V0PC9idXR0b24+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvY2hhbmdlbG9hZGVkZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJjaGFuZ2UtbG9hZGVkLWRhdGFzZXRcXFwiPjxkaXYgbmctaWY9XFxcInVzZXJEYXRhLmxlbmd0aFxcXCI+PGgzPlVwbG9hZGVkIERhdGFzZXRzPC9oMz48dWw+PGxpIG5nLXJlcGVhdD1cXFwiZGF0YXNldCBpbiB1c2VyRGF0YSB0cmFjayBieSBkYXRhc2V0LmlkXFxcIiBuZy1jbGFzcz1cXFwie3NlbGVjdGVkOiBEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkfVxcXCI+PGEgY2xhc3M9XFxcImRhdGFzZXRcXFwiIG5nLWNsaWNrPVxcXCJzZWxlY3REYXRhc2V0KGRhdGFzZXQpXFxcIiBuZy1kaXNhYmxlZD1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWRhdGFiYXNlXFxcIj48L2k+IDxzdHJvbmc+e3tkYXRhc2V0Lm5hbWV9fTwvc3Ryb25nPjwvYT4gPHNwYW4gbmctaWY9XFxcImRhdGFzZXQuZGVzY3JpcHRpb25cXFwiPnt7ZGF0YXNldC5kZXNjcmlwdGlvbn19PC9zcGFuPiA8c3Ryb25nIG5nLWlmPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID09PSBkYXRhc2V0XFxcIj4oc2VsZWN0ZWQpPC9zdHJvbmc+PC9saT48L3VsPjwvZGl2PjxoMz5FeHBsb3JlIGEgU2FtcGxlIERhdGFzZXQ8L2gzPjx1bCBjbGFzcz1cXFwibG9hZGVkLWRhdGFzZXQtbGlzdFxcXCI+PGxpIG5nLXJlcGVhdD1cXFwiZGF0YXNldCBpbiBzYW1wbGVEYXRhIHRyYWNrIGJ5IGRhdGFzZXQuaWRcXFwiIG5nLWNsYXNzPVxcXCJ7c2VsZWN0ZWQ6IERhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWR9XFxcIj48YSBjbGFzcz1cXFwiZGF0YXNldFxcXCIgbmctY2xpY2s9XFxcInNlbGVjdERhdGFzZXQoZGF0YXNldClcXFwiIG5nLWRpc2FibGVkPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZGF0YWJhc2VcXFwiPjwvaT4gPHN0cm9uZz57e2RhdGFzZXQubmFtZX19PC9zdHJvbmc+PC9hPiA8c3Ryb25nIG5nLWlmPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID09PSBkYXRhc2V0XFxcIj4oc2VsZWN0ZWQpPC9zdHJvbmc+IDxlbSBuZy1pZj1cXFwiZGF0YXNldC5kZXNjcmlwdGlvblxcXCI+e3tkYXRhc2V0LmRlc2NyaXB0aW9ufX08L2VtPjwvbGk+PC91bD48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2RhdGFzZXRtb2RhbC5odG1sXCIsXCI8bW9kYWwgaWQ9XFxcImRhdGFzZXQtbW9kYWxcXFwiIG1heC13aWR0aD1cXFwiODAwcHhcXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLWhlYWRlclxcXCI+PG1vZGFsLWNsb3NlLWJ1dHRvbj48L21vZGFsLWNsb3NlLWJ1dHRvbj48aDI+QWRkIERhdGFzZXQ8L2gyPjwvZGl2PjxkaXYgY2xhc3M9XFxcIm1vZGFsLW1haW5cXFwiPjx0YWJzZXQ+PHRhYiBoZWFkaW5nPVxcXCJDaGFuZ2UgRGF0YXNldFxcXCI+PGNoYW5nZS1sb2FkZWQtZGF0YXNldD48L2NoYW5nZS1sb2FkZWQtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIlBhc3RlIG9yIFVwbG9hZCBEYXRhXFxcIj48cGFzdGUtZGF0YXNldD48L3Bhc3RlLWRhdGFzZXQ+PC90YWI+PHRhYiBoZWFkaW5nPVxcXCJGcm9tIFVSTFxcXCI+PGFkZC11cmwtZGF0YXNldD48L2FkZC11cmwtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIkZyb20gTXlyaWFcXFwiPjxhZGQtbXlyaWEtZGF0YXNldD48L2FkZC1teXJpYS1kYXRhc2V0PjwvdGFiPjwvdGFic2V0PjwvZGl2PjwvbW9kYWw+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuaHRtbFwiLFwiPGJ1dHRvbiBpZD1cXFwic2VsZWN0LWRhdGFcXFwiIGNsYXNzPVxcXCJzbWFsbC1idXR0b24gc2VsZWN0LWRhdGFcXFwiIG5nLWNsaWNrPVxcXCJsb2FkRGF0YXNldCgpO1xcXCI+Q2hhbmdlPC9idXR0b24+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9maWxlZHJvcHpvbmUuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiZHJvcHpvbmVcXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9wYXN0ZWRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwicGFzdGUtZGF0YVxcXCI+PGZpbGUtZHJvcHpvbmUgZGF0YXNldD1cXFwiZGF0YXNldFxcXCIgbWF4LWZpbGUtc2l6ZT1cXFwiMTBcXFwiIHZhbGlkLW1pbWUtdHlwZXM9XFxcIlt0ZXh0L2NzdiwgdGV4dC9qc29uLCB0ZXh0L3Rzdl1cXFwiPjxkaXYgY2xhc3M9XFxcInVwbG9hZC1kYXRhXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LWZpbGVcXFwiPkZpbGU8L2xhYmVsPiA8aW5wdXQgdHlwZT1cXFwiZmlsZVxcXCIgaWQ9XFxcImRhdGFzZXQtZmlsZVxcXCIgYWNjZXB0PVxcXCJ0ZXh0L2Nzdix0ZXh0L3RzdlxcXCI+PC9kaXY+PHA+VXBsb2FkIGEgQ1NWLCBvciBwYXN0ZSBkYXRhIGluIDxhIGhyZWY9XFxcImh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0NvbW1hLXNlcGFyYXRlZF92YWx1ZXNcXFwiPkNTVjwvYT4gZm9ybWF0IGludG8gdGhlIGZpZWxkcy48L3A+PGRpdiBjbGFzcz1cXFwiZHJvcHpvbmUtdGFyZ2V0XFxcIj48cD5Ecm9wIENTViBmaWxlIGhlcmU8L3A+PC9kaXY+PC9kaXY+PGZvcm0gbmctc3VibWl0PVxcXCJhZGREYXRhc2V0KClcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtbmFtZVxcXCI+TmFtZTwvbGFiZWw+IDxpbnB1dCB0eXBlPVxcXCJuYW1lXFxcIiBuZy1tb2RlbD1cXFwiZGF0YXNldC5uYW1lXFxcIiBpZD1cXFwiZGF0YXNldC1uYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48dGV4dGFyZWEgbmctbW9kZWw9XFxcImRhdGFzZXQuZGF0YVxcXCIgbmctbW9kZWwtb3B0aW9ucz1cXFwieyB1cGRhdGVPbjogXFwnZGVmYXVsdCBibHVyXFwnLCBkZWJvdW5jZTogeyBcXCdkZWZhdWx0XFwnOiAxNywgXFwnYmx1clxcJzogMCB9fVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XFxuICAgICAgPC90ZXh0YXJlYT48L2Rpdj48YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCI+QWRkIGRhdGE8L2J1dHRvbj48L2Zvcm0+PC9maWxlLWRyb3B6b25lPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImZpZWxkaW5mby9maWVsZGluZm8uaHRtbFwiLFwiPHNwYW4gY2xhc3M9XFxcImZpZWxkLWluZm9cXFwiPjxzcGFuIGNsYXNzPVxcXCJoZmxleCBmdWxsLXdpZHRoXFxcIiBuZy1jbGljaz1cXFwiY2xpY2tlZCgkZXZlbnQpXFxcIj48c3BhbiBjbGFzcz1cXFwidHlwZS1jYXJldFxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6ICFkaXNhYmxlQ291bnRDYXJldCB8fCBmaWVsZERlZi5hZ2dyZWdhdGUhPT1cXCdjb3VudFxcJ31cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jYXJldC1kb3duXFxcIiBuZy1zaG93PVxcXCJzaG93Q2FyZXRcXFwiPjwvaT4gPHNwYW4gY2xhc3M9XFxcInR5cGUgZmEge3tpY29ufX1cXFwiIG5nLXNob3c9XFxcInNob3dUeXBlXFxcIiB0aXRsZT1cXFwie3t0eXBlTmFtZXNbZmllbGREZWYudHlwZV19fVxcXCI+PC9zcGFuPjwvc3Bhbj4gPHNwYW4gbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSE9PVxcJ2NvdW50XFwnXFxcIiBjbGFzcz1cXFwiZmllbGQtaW5mby10ZXh0XFxcIj48c3BhbiBuZy1pZj1cXFwiZnVuYyhmaWVsZERlZilcXFwiIGNsYXNzPVxcXCJmaWVsZC1mdW5jXFxcIiBuZy1jbGFzcz1cXFwie2FueTogZmllbGREZWYuX2FueX1cXFwiPnt7IGZ1bmMoZmllbGREZWYpIH19PC9zcGFuPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIiBuZy1jbGFzcz1cXFwie2hhc2Z1bmM6IGZ1bmMoZmllbGREZWYpLCBhbnk6IGZpZWxkRGVmLl9hbnl9XFxcIj57eyBmaWVsZERlZi5maWVsZCB8IHVuZGVyc2NvcmUyc3BhY2UgfX08L3NwYW4+PC9zcGFuPiA8c3BhbiBuZy1pZj1cXFwiZmllbGREZWYuYWdncmVnYXRlPT09XFwnY291bnRcXCdcXFwiIGNsYXNzPVxcXCJmaWVsZC1jb3VudCBmaWVsZC1pbmZvLXRleHRcXFwiPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIj5DT1VOVDwvc3Bhbj48L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJuby1zaHJpbmsgcmVtb3ZlXFxcIiBuZy1zaG93PVxcXCJzaG93UmVtb3ZlXFxcIj48YSBjbGFzcz1cXFwicmVtb3ZlLWZpZWxkXFxcIiBuZy1jbGljaz1cXFwicmVtb3ZlQWN0aW9uKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10aW1lc1xcXCI+PC9pPjwvYT48L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJuby1zaHJpbmsgaW5mb1xcXCIgbmctc2hvdz1cXFwic2hvd0luZm9cXFwiPjxpIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGUgIT09IFxcJ2NvdW50XFwnICYmIGNvbnRhaW5zVHlwZShbdmxUeXBlLk5PTUlOQUwsIHZsVHlwZS5PUkRJTkFMXSwgZmllbGREZWYudHlwZSlcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5OYW1lOjwvc3Ryb25nPiB7e2ZpZWxkRGVmLmZpZWxkfX08YnI+IDxzdHJvbmc+Q2FyZGluYWxpdHk6PC9zdHJvbmc+IHt7c3RhdHMuZGlzdGluY3QgfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NaW46PC9zdHJvbmc+IHt7c3RhdHMubWlufX08YnI+IDxzdHJvbmc+TWF4Ojwvc3Ryb25nPiB7e3N0YXRzLm1heH19PGJyPiA8c3Ryb25nPlNhbXBsZTo8L3N0cm9uZz4gPHNwYW4gY2xhc3M9XFwnc2FtcGxlXFwnPnt7c3RhdHMuc2FtcGxlLmpvaW4oXFwnLCBcXCcpfX08L3NwYW4+IDwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9pPiA8aSBuZy1pZj1cXFwiZmllbGREZWYuYWdncmVnYXRlICE9PSBcXCdjb3VudFxcJyAmJiBmaWVsZERlZi50eXBlID09PSB2bFR5cGUuVEVNUE9SQUxcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5OYW1lOjwvc3Ryb25nPiB7e2ZpZWxkRGVmLmZpZWxkfX08YnI+IDxzdHJvbmc+Q2FyZGluYWxpdHk6PC9zdHJvbmc+IHt7c3RhdHMuZGlzdGluY3QgfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NaW46PC9zdHJvbmc+IHt7c3RhdHMubWluIHwgZGF0ZTogc2hvcnR9fTxicj4gPHN0cm9uZz5NYXg6PC9zdHJvbmc+IHt7c3RhdHMubWF4IHwgZGF0ZTogc2hvcnR9fTxicj4gPHN0cm9uZz5TYW1wbGU6PC9zdHJvbmc+IDxzcGFuIGNsYXNzPVxcJ3NhbXBsZVxcJz57e3N0YXRzLnNhbXBsZS5qb2luKFxcJywgXFwnKX19PC9zcGFuPiA8L2Rpdj5cXFwiIHRvb2x0aXAtc2lkZT1cXFwicmlnaHRcXFwiPjwvaT4gPGkgbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSAhPT0gXFwnY291bnRcXCcgJiYgZmllbGREZWYudHlwZSA9PT0gdmxUeXBlLlFVQU5USVRBVElWRVxcXCIgY2xhc3M9XFxcImZhIGZhLWluZm8tY2lyY2xlXFxcIiB0b29sdGlwcz1cXFwiXFxcIiB0b29sdGlwLXNpemU9XFxcInNtYWxsXFxcIiB0b29sdGlwLWh0bWw9XFxcIjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPiA8c3Ryb25nPk5hbWU6PC9zdHJvbmc+IHt7ZmllbGREZWYuZmllbGR9fTxicj4gPHN0cm9uZz5DYXJkaW5hbGl0eTo8L3N0cm9uZz4ge3tzdGF0cy5kaXN0aW5jdCB8IG51bWJlcn19PGJyPiA8c3Ryb25nPk1pbjo8L3N0cm9uZz4ge3tzdGF0cy5taW4gfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NYXg6PC9zdHJvbmc+IHt7c3RhdHMubWF4IHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+U3RkZXY6PC9zdHJvbmc+IHt7c3RhdHMuc3RkZXYgfCBudW1iZXI6Mn19PGJyPiA8c3Ryb25nPk1lYW46PC9zdHJvbmc+IHt7c3RhdHMubWVhbiB8IG51bWJlcjoyfX08YnI+IDxzdHJvbmc+TWVkaWFuOjwvc3Ryb25nPiB7e3N0YXRzLm1lZGlhbiB8IG51bWJlcn19PGJyPiA8c3Ryb25nPlNhbXBsZTo8L3N0cm9uZz4gPHNwYW4gY2xhc3M9XFwnc2FtcGxlXFwnPnt7c3RhdHMuc2FtcGxlLmpvaW4oXFwnLCBcXCcpfX08L3NwYW4+IDwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9pPjxpIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGUgPT09IFxcJ2NvdW50XFwnXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPGRpdiBjbGFzcz1cXCd0b29sdGlwLWNvbnRlbnRcXCc+IDxzdHJvbmc+Q291bnQ6PC9zdHJvbmc+IHt7c3RhdHMubWF4fX0gPC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L2k+PC9zcGFuPjwvc3Bhbj48L3NwYW4+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwibW9kYWwvbW9kYWwuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwibW9kYWxcXFwiIG5nLWlmPVxcXCJpc09wZW5cXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLXdyYXBwZXJcXFwiIHN0eWxlPVxcXCJ7e3dyYXBwZXJTdHlsZX19XFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcIm1vZGFsL21vZGFsY2xvc2VidXR0b24uaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwicmlnaHRcXFwiPjxhIG5nLWNsaWNrPVxcXCJjbG9zZU1vZGFsKClcXFwiIGNsYXNzPVxcXCJyaWdodFxcXCI+Q2xvc2U8L2E+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGFicy90YWIuaHRtbFwiLFwiPGRpdiBuZy1pZj1cXFwiYWN0aXZlXFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRhYnMvdGFic2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInRhYi1jb250YWluZXJcXFwiPjxkaXY+PGEgY2xhc3M9XFxcInRhYlxcXCIgbmctcmVwZWF0PVxcXCJ0YWIgaW4gdGFic2V0LnRhYnNcXFwiIG5nLWNsYXNzPVxcXCJ7XFwnYWN0aXZlXFwnOiB0YWIuYWN0aXZlfVxcXCIgbmctY2xpY2s9XFxcInRhYnNldC5zaG93VGFiKHRhYilcXFwiPnt7dGFiLmhlYWRpbmd9fTwvYT48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ0YWItY29udGVudHNcXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidmxwbG90L3ZscGxvdC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ2bC1wbG90XFxcIiBpZD1cXFwidmlzLXt7dmlzSWR9fVxcXCIgbmctY2xhc3M9XFxcInsgZml0OiAhYWx3YXlzU2Nyb2xsYWJsZSAmJiAhb3ZlcmZsb3cgJiYgKG1heEhlaWdodCAmJiAoIWhlaWdodCB8fCBoZWlnaHQgPD0gbWF4SGVpZ2h0KSkgJiYgKG1heFdpZHRoICYmICghd2lkdGggfHwgd2lkdGggPD0gbWF4V2lkdGgpKSwgb3ZlcmZsb3c6IGFsd2F5c1Njcm9sbGFibGUgfHwgb3ZlcmZsb3cgfHwgKG1heEhlaWdodCAmJiBoZWlnaHQgJiYgaGVpZ2h0ID4gbWF4SGVpZ2h0KSB8fCAobWF4V2lkdGggJiYgd2lkdGggJiYgd2lkdGggPiBtYXhXaWR0aCksIHNjcm9sbDogYWx3YXlzU2Nyb2xsYWJsZSB8fCB1bmxvY2tlZCB8fCBob3ZlckZvY3VzIH1cXFwiIG5nLW1vdXNlZG93bj1cXFwidW5sb2NrZWQ9IXRodW1ibmFpbFxcXCIgbmctbW91c2V1cD1cXFwidW5sb2NrZWQ9ZmFsc2VcXFwiIG5nLW1vdXNlb3Zlcj1cXFwibW91c2VvdmVyKClcXFwiIG5nLW1vdXNlb3V0PVxcXCJtb3VzZW91dCgpXFxcIj48ZGl2IGNsYXNzPVxcXCJ2aXMtdG9vbHRpcFxcXCIgbmctc2hvdz1cXFwidG9vbHRpcEFjdGl2ZVxcXCI+PHRhYmxlPjx0ciBuZy1yZXBlYXQ9XFxcInAgaW4gZGF0YVxcXCI+PHRkIGNsYXNzPVxcXCJrZXlcXFwiPnt7cFswXX19PC90ZD48dGQgY2xhc3M9XFxcInZhbHVlXFxcIj48Yj57e3BbMV19fTwvYj48L3RkPjwvdHI+PC90YWJsZT48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ2bHBsb3Rncm91cC92bHBsb3Rncm91cC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ2bC1wbG90LWdyb3VwIHZmbGV4XFxcIj48ZGl2IG5nLXNob3c9XFxcInNob3dFeHBhbmQgfHwgZmllbGRTZXQgfHwgc2hvd1RyYW5zcG9zZSB8fCBzaG93Qm9va21hcmsgJiYgQm9va21hcmtzLmlzU3VwcG9ydGVkIHx8IHNob3dUb2dnbGVcXFwiIGNsYXNzPVxcXCJ2bC1wbG90LWdyb3VwLWhlYWRlciBuby1zaHJpbmtcXFwiPjxkaXYgY2xhc3M9XFxcImZpZWxkLXNldC1pbmZvXFxcIj48ZmllbGQtaW5mbyBuZy1yZXBlYXQ9XFxcImZpZWxkRGVmIGluIGZpZWxkU2V0XFxcIiBuZy1pZj1cXFwiZmllbGRTZXRcXFwiIGZpZWxkLWRlZj1cXFwiZmllbGREZWZcXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgbmctY2xhc3M9XFxcInsgc2VsZWN0ZWQ6IGFsd2F5c1NlbGVjdGVkIHx8IChpc1NlbGVjdGVkICYmIGlzU2VsZWN0ZWQoZmllbGREZWYuZmllbGQpKSwgdW5zZWxlY3RlZDogaXNTZWxlY3RlZCAmJiAhaXNTZWxlY3RlZChmaWVsZERlZi5maWVsZCksIGhpZ2hsaWdodGVkOiAoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0gfVxcXCIgbmctbW91c2VvdmVyPVxcXCIoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0gPSB0cnVlXFxcIiBuZy1tb3VzZW91dD1cXFwiKGhpZ2hsaWdodGVkfHx7fSlbZmllbGREZWYuZmllbGRdID0gZmFsc2VcXFwiPjwvZmllbGQtaW5mbz48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ0b29sYm94XFxcIj48YSBuZy1pZj1cXFwiY29uc3RzLmRlYnVnICYmIHNob3dEZWJ1Z1xcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS13cmVuY2hcXFwiIG5nLWNsaWNrPVxcXCJzaENvcGllZD1cXCdcXCc7IHZsQ29waWVkPVxcJ1xcJzsgdmdDb3BpZWQ9XFwnXFwnO1xcXCIgbmctbW91c2VvdmVyPVxcXCJpbml0aWFsaXplUG9wdXAoKTtcXFwiPjwvaT48L2E+PHZsLXBsb3QtZ3JvdXAtcG9wdXAgbmctaWY9XFxcImNvbnN0cy5kZWJ1ZyAmJiBzaG93RGVidWcgJiYgcmVuZGVyUG9wdXBcXFwiPjwvdmwtcGxvdC1ncm91cC1wb3B1cD48YSBuZy1pZj1cXFwic2hvd01hcmtcXFwiIGNsYXNzPVxcXCJjb21tYW5kIGRpc2FibGVkXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZm9udFxcXCI+PC9pPiA8aSBjbGFzcz1cXFwiZmEgZmEtbGluZS1jaGFydFxcXCI+PC9pPiA8aSBjbGFzcz1cXFwiZmEgZmEtYXJlYS1jaGFydFxcXCI+PC9pPiA8aSBjbGFzcz1cXFwiZmEgZmEtYmFyLWNoYXJ0XFxcIj48L2k+IDxpIGNsYXNzPVxcXCJmYSBmYS1jaXJjbGUtb1xcXCI+PC9pPjwvYT4gPGEgbmctaWY9XFxcInNob3dMb2cgJiYgY2hhcnQudmxTcGVjICYmIGxvZy5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgXFwneFxcJylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwibG9nLnRvZ2dsZShjaGFydC52bFNwZWMsIFxcJ3hcXCcpXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogbG9nLmFjdGl2ZShjaGFydC52bFNwZWMsIFxcJ3hcXCcpfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWxvbmctYXJyb3ctcmlnaHRcXFwiPjwvaT4gPHNtYWxsPkxvZyBYPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93TG9nICYmIGNoYXJ0LnZsU3BlYyAmJiBsb2cuc3VwcG9ydChjaGFydC52bFNwZWMsIFxcJ3lcXCcpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcImxvZy50b2dnbGUoY2hhcnQudmxTcGVjLCBcXCd5XFwnKVxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6IGxvZy5hY3RpdmUoY2hhcnQudmxTcGVjLCBcXCd5XFwnKX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1sb25nLWFycm93LXVwXFxcIj48L2k+IDxzbWFsbD5Mb2cgWTwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd1NvcnQgJiYgY2hhcnQudmxTcGVjICYmIHRvZ2dsZVNvcnQuc3VwcG9ydChjaGFydC52bFNwZWMsIERhdGFzZXQuc3RhdHMpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRvZ2dsZVNvcnQudG9nZ2xlKGNoYXJ0LnZsU3BlYylcXFwiPjxpIGNsYXNzPVxcXCJmYSBzb3J0XFxcIiBuZy1jbGFzcz1cXFwidG9nZ2xlU29ydENsYXNzKGNoYXJ0LnZsU3BlYylcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPlNvcnQ8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dGaWx0ZXJOdWxsICYmIGNoYXJ0LnZsU3BlYyAmJiB0b2dnbGVGaWx0ZXJOdWxsLnN1cHBvcnQoY2hhcnQudmxTcGVjLCBEYXRhc2V0LnN0YXRzKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0b2dnbGVGaWx0ZXJOdWxsKGNoYXJ0LnZsU3BlYylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBjaGFydC52bFNwZWMgJiYgY2hhcnQudmxTcGVjLmNmZy5maWx0ZXJOdWxsLk99XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZmlsdGVyXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5GaWx0ZXI8L3NtYWxsPiA8c21hbGw+TlVMTDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd1RyYW5zcG9zZVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0cmFuc3Bvc2UoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXJlZnJlc2ggdHJhbnNwb3NlXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5Td2FwIFgvWTwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0Jvb2ttYXJrICYmIEJvb2ttYXJrcy5pc1N1cHBvcnRlZFxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJCb29rbWFya3MudG9nZ2xlKGNoYXJ0KVxcXCIgbmctY2xhc3M9XFxcIntkaXNhYmxlZDogIWNoYXJ0LnZsU3BlYy5lbmNvZGluZywgYWN0aXZlOiBCb29rbWFya3MuaXNCb29rbWFya2VkKGNoYXJ0LnNob3J0aGFuZCl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtYm9va21hcmtcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPkJvb2ttYXJrPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93RXhwYW5kXFxcIiBuZy1jbGljaz1cXFwiZXhwYW5kQWN0aW9uKClcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZXhwYW5kXFxcIj48L2k+PC9hPjwvZGl2PjwvZGl2Pjx2bC1wbG90IGNsYXNzPVxcXCJmbGV4LWdyb3ctMVxcXCIgZGF0YS1maWVsZHNldD1cXFwie2ZpZWxkU2V0LmtleX19XFxcIiBjaGFydD1cXFwiY2hhcnRcXFwiIGRpc2FibGVkPVxcXCJkaXNhYmxlZFxcXCIgaXMtaW4tbGlzdD1cXFwiaXNJbkxpc3RcXFwiIGFsd2F5cy1zY3JvbGxhYmxlPVxcXCJhbHdheXNTY3JvbGxhYmxlXFxcIiBjb25maWctc2V0PVxcXCJ7e2NvbmZpZ1NldHx8XFwnc21hbGxcXCd9fVxcXCIgbWF4LWhlaWdodD1cXFwibWF4SGVpZ2h0XFxcIiBtYXgtd2lkdGg9XFxcIm1heFdpZHRoXFxcIiBvdmVyZmxvdz1cXFwib3ZlcmZsb3dcXFwiIHByaW9yaXR5PVxcXCJwcmlvcml0eVxcXCIgcmVzY2FsZT1cXFwicmVzY2FsZVxcXCIgdGh1bWJuYWlsPVxcXCJ0aHVtYm5haWxcXFwiIHRvb2x0aXA9XFxcInRvb2x0aXBcXFwiPjwvdmwtcGxvdD48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ2bHBsb3Rncm91cC92bHBsb3Rncm91cHBvcHVwLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImRyb3AtY29udGFpbmVyXFxcIj48ZGl2IGNsYXNzPVxcXCJwb3B1cC1tZW51IHBvcHVwLWNvbW1hbmQgbm8tc2hyaW5rIGRldi10b29sXFxcIj48ZGl2IGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48c3BhbiBjbGFzcz1cXFwiZGVidWdcXFwiPlZsczwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInNoQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQuc2hvcnRoYW5kXFxcIj5Db3B5PC9hPiAvIDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgbmctY2xpY2s9XFxcImxvZ0NvZGUoXFwnVkwgc2hvcnRoYW5kXFwnLCBjaGFydC5zaG9ydGhhbmQpOyBzaENvcGllZD1cXCcoTG9nZ2VkKVxcJztcXFwiPkxvZzwvYT4gPHNwYW4+e3tzaENvcGllZH19PC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxzcGFuIGNsYXNzPVxcXCJkZWJ1Z1xcXCI+Vmw8L3NwYW4+IDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgdWktemVyb2NsaXA9XFxcIlxcXCIgemVyb2NsaXAtY29waWVkPVxcXCJ2bENvcGllZD1cXCcoQ29waWVkKVxcJ1xcXCIgemVyb2NsaXAtbW9kZWw9XFxcImNoYXJ0LmNsZWFuU3BlYyB8IGNvbXBhY3RKU09OXFxcIj5Db3B5PC9hPiAvIDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgbmctY2xpY2s9XFxcImxvZ0NvZGUoXFwnVmVnYS1MaXRlXFwnLCBjaGFydC5jbGVhblNwZWMpOyB2bENvcGllZD1cXCcoTG9nZ2VkKVxcJztcXFwiPkxvZzwvYT4gPHNwYW4+e3t2bENvcGllZH19PC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxzcGFuIGNsYXNzPVxcXCJkZWJ1Z1xcXCI+Vmc8L3NwYW4+IDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgdWktemVyb2NsaXA9XFxcIlxcXCIgemVyb2NsaXAtY29waWVkPVxcXCJ2Z0NvcGllZD1cXCcoQ29waWVkKVxcJ1xcXCIgemVyb2NsaXAtbW9kZWw9XFxcImNoYXJ0LnZnU3BlYyB8IGNvbXBhY3RKU09OXFxcIj5Db3B5PC9hPiAvIDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgbmctY2xpY2s9XFxcImxvZ0NvZGUoXFwnVmVnYVxcJywgY2hhcnQudmdTcGVjKTsgdmdDb3BpZWQ9XFwnKExvZ2dlZClcXCc7XFxcIj5Mb2c8L2E+IDxzcGFuPnt7dmdDb3BpZWR9fTwvc3Bhbj48L2Rpdj48YSBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCIgbmctaHJlZj1cXFwie3sge3R5cGU6XFwndmxcXCcsIHNwZWM6IGNoYXJ0LmNsZWFuU3BlY30gfCByZXBvcnRVcmwgfX1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5SZXBvcnQgQmFkIFJlbmRlcjwvYT4gPGEgbmctY2xpY2s9XFxcInNob3dGZWF0dXJlPSFzaG93RmVhdHVyZVxcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPnt7Y2hhcnQuc2NvcmV9fTwvYT48ZGl2IG5nLXJlcGVhdD1cXFwiZiBpbiBjaGFydC5zY29yZUZlYXR1cmVzIHRyYWNrIGJ5IGYucmVhc29uXFxcIj5be3tmLnNjb3JlfX1dIHt7Zi5yZWFzb259fTwvZGl2PjwvZGl2PjwvZGl2PlwiKTt9XSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FsZXJ0TWVzc2FnZXMnLCBmdW5jdGlvbihBbGVydHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdhbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHt9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuQWxlcnRzID0gQWxlcnRzO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdBbGVydHMnLCBmdW5jdGlvbigkdGltZW91dCwgXykge1xuICAgIHZhciBBbGVydHMgPSB7fTtcblxuICAgIEFsZXJ0cy5hbGVydHMgPSBbXTtcblxuICAgIEFsZXJ0cy5hZGQgPSBmdW5jdGlvbihtc2csIGRpc21pc3MpIHtcbiAgICAgIHZhciBtZXNzYWdlID0ge21zZzogbXNnfTtcbiAgICAgIEFsZXJ0cy5hbGVydHMucHVzaChtZXNzYWdlKTtcbiAgICAgIGlmIChkaXNtaXNzKSB7XG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBpbmRleCA9IF8uZmluZEluZGV4KEFsZXJ0cy5hbGVydHMsIG1lc3NhZ2UpO1xuICAgICAgICAgIEFsZXJ0cy5jbG9zZUFsZXJ0KGluZGV4KTtcbiAgICAgICAgfSwgZGlzbWlzcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIEFsZXJ0cy5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIEFsZXJ0cy5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFsZXJ0cztcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6Ym9va21hcmtMaXN0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYm9va21hcmtMaXN0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYm9va21hcmtMaXN0JywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBoaWdobGlnaHRlZDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgLy8gVGhlIGJvb2ttYXJrIGxpc3QgaXMgZGVzaWduZWQgdG8gcmVuZGVyIHdpdGhpbiBhIG1vZGFsIG92ZXJsYXkuXG4gICAgICAgIC8vIEJlY2F1c2UgbW9kYWwgY29udGVudHMgYXJlIGhpZGRlbiB2aWEgbmctaWYsIGlmIHRoaXMgbGluayBmdW5jdGlvbiBpc1xuICAgICAgICAvLyBleGVjdXRpbmcgaXQgaXMgYmVjYXVzZSB0aGUgZGlyZWN0aXZlIGlzIGJlaW5nIHNob3duLiBMb2cgdGhlIGV2ZW50OlxuICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfT1BFTik7XG4gICAgICAgIHNjb3BlLmxvZ0Jvb2ttYXJrc0Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19DTE9TRSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuQm9va21hcmtzID0gQm9va21hcmtzO1xuICAgICAgICBzY29wZS5jb25zdHMgPSBjb25zdHM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIHZsdWkuQm9va21hcmtzXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgQm9va21hcmtzXG4gKiBTZXJ2aWNlIGluIHRoZSB2bHVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdCb29rbWFya3MnLCBmdW5jdGlvbihfLCB2bCwgbG9jYWxTdG9yYWdlU2VydmljZSwgTG9nZ2VyLCBEYXRhc2V0KSB7XG4gICAgdmFyIEJvb2ttYXJrcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5kaWN0ID0ge307XG4gICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgICB0aGlzLmlzU3VwcG9ydGVkID0gbG9jYWxTdG9yYWdlU2VydmljZS5pc1N1cHBvcnRlZDtcbiAgICB9O1xuXG4gICAgdmFyIHByb3RvID0gQm9va21hcmtzLnByb3RvdHlwZTtcblxuICAgIHByb3RvLnVwZGF0ZUxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5sZW5ndGggPSBPYmplY3Qua2V5cyh0aGlzLmRpY3QpLmxlbmd0aDtcbiAgICB9O1xuXG4gICAgcHJvdG8uc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgbG9jYWxTdG9yYWdlU2VydmljZS5zZXQoJ2Jvb2ttYXJrcycsIHRoaXMuZGljdCk7XG4gICAgfTtcblxuICAgIHByb3RvLmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZGljdCA9IGxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0KCdib29rbWFya3MnKSB8fCB7fTtcbiAgICAgIHRoaXMudXBkYXRlTGVuZ3RoKCk7XG4gICAgfTtcblxuICAgIHByb3RvLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmRpY3QgPSB7fTtcbiAgICAgIHRoaXMudXBkYXRlTGVuZ3RoKCk7XG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMRUFSKTtcbiAgICB9O1xuXG4gICAgcHJvdG8udG9nZ2xlID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgIHZhciBzaG9ydGhhbmQgPSBjaGFydC5zaG9ydGhhbmQ7XG5cbiAgICAgIGlmICh0aGlzLmRpY3Rbc2hvcnRoYW5kXSkge1xuICAgICAgICB0aGlzLnJlbW92ZShjaGFydCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFkZChjaGFydCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHByb3RvLmFkZCA9IGZ1bmN0aW9uKGNoYXJ0KSB7XG4gICAgICB2YXIgc2hvcnRoYW5kID0gY2hhcnQuc2hvcnRoYW5kO1xuXG4gICAgICBjb25zb2xlLmxvZygnYWRkaW5nJywgY2hhcnQudmxTcGVjLCBzaG9ydGhhbmQpO1xuXG4gICAgICBjaGFydC50aW1lQWRkZWQgPSAobmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuXG4gICAgICBjaGFydC5zdGF0cyA9IERhdGFzZXQuc3RhdHM7XG5cbiAgICAgIHRoaXMuZGljdFtzaG9ydGhhbmRdID0gXy5jbG9uZURlZXAoY2hhcnQpO1xuICAgICAgdGhpcy51cGRhdGVMZW5ndGgoKTtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfQURELCBzaG9ydGhhbmQpO1xuICAgIH07XG5cbiAgICBwcm90by5yZW1vdmUgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcblxuICAgICAgY29uc29sZS5sb2coJ3JlbW92aW5nJywgY2hhcnQudmxTcGVjLCBzaG9ydGhhbmQpO1xuXG4gICAgICBkZWxldGUgdGhpcy5kaWN0W3Nob3J0aGFuZF07XG4gICAgICB0aGlzLnVwZGF0ZUxlbmd0aCgpO1xuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19SRU1PVkUsIHNob3J0aGFuZCk7XG4gICAgfTtcblxuICAgIHByb3RvLmlzQm9va21hcmtlZCA9IGZ1bmN0aW9uKHNob3J0aGFuZCkge1xuICAgICAgcmV0dXJuIHNob3J0aGFuZCBpbiB0aGlzLmRpY3Q7XG4gICAgfTtcblxuICAgIHJldHVybiBuZXcgQm9va21hcmtzKCk7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBTZXJ2aWNlIGZvciB0aGUgc3BlYyBjb25maWcuXG4vLyBXZSBrZWVwIHRoaXMgc2VwYXJhdGUgc28gdGhhdCBjaGFuZ2VzIGFyZSBrZXB0IGV2ZW4gaWYgdGhlIHNwZWMgY2hhbmdlcy5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ0NvbmZpZycsIGZ1bmN0aW9uKHZsLCBfKSB7XG4gICAgdmFyIENvbmZpZyA9IHt9O1xuXG4gICAgQ29uZmlnLnNjaGVtYSA9IHZsLnNjaGVtYS5zY2hlbWEucHJvcGVydGllcy5jb25maWc7XG4gICAgQ29uZmlnLmRhdGFzY2hlbWEgPSB2bC5zY2hlbWEuc2NoZW1hLnByb3BlcnRpZXMuZGF0YTtcblxuICAgIENvbmZpZy5kYXRhID0gdmwuc2NoZW1hLnV0aWwuaW5zdGFudGlhdGUoQ29uZmlnLmRhdGFzY2hlbWEpO1xuICAgIENvbmZpZy5jb25maWcgPSB2bC5zY2hlbWEudXRpbC5pbnN0YW50aWF0ZShDb25maWcuc2NoZW1hKTtcblxuICAgIENvbmZpZy5nZXRDb25maWcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfLmNsb25lRGVlcChDb25maWcuY29uZmlnKTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLmdldERhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBDb25maWcuZGF0YTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLmxhcmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzaW5nbGVXaWR0aDogNDAwLFxuICAgICAgICBzaW5nbGVIZWlnaHQ6IDQwMCxcbiAgICAgICAgbGFyZ2VCYW5kTWF4Q2FyZGluYWxpdHk6IDIwXG4gICAgICB9O1xuICAgIH07XG5cbiAgICBDb25maWcuc21hbGwgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLnVwZGF0ZURhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0LCB0eXBlKSB7XG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgQ29uZmlnLmRhdGEudmFsdWVzID0gZGF0YXNldC52YWx1ZXM7XG4gICAgICAgIGRlbGV0ZSBDb25maWcuZGF0YS51cmw7XG4gICAgICAgIENvbmZpZy5kYXRhLmZvcm1hdFR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBDb25maWcuZGF0YS51cmwgPSBkYXRhc2V0LnVybDtcbiAgICAgICAgZGVsZXRlIENvbmZpZy5kYXRhLnZhbHVlcztcbiAgICAgICAgQ29uZmlnLmRhdGEuZm9ybWF0VHlwZSA9IHR5cGU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBDb25maWc7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmFkZE15cmlhRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGFkZE15cmlhRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FkZE15cmlhRGF0YXNldCcsIGZ1bmN0aW9uICgkaHR0cCwgRGF0YXNldCwgY29uc3RzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc2NvcGUgdmFyaWFibGVzXG4gICAgICAgIHNjb3BlLm15cmlhUmVzdFVybCA9IGNvbnN0cy5teXJpYVJlc3Q7XG4gICAgICAgIHNjb3BlLm15cmlhRGF0YXNldHMgPSBbXTtcbiAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0ID0gbnVsbDtcblxuICAgICAgICBzY29wZS5sb2FkRGF0YXNldHMgPSBmdW5jdGlvbihxdWVyeSkge1xuICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoc2NvcGUubXlyaWFSZXN0VXJsICsgJy9kYXRhc2V0L3NlYXJjaC8/cT0nICsgcXVlcnkpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICBzY29wZS5teXJpYURhdGFzZXRzID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIExvYWQgdGhlIGF2YWlsYWJsZSBkYXRhc2V0cyBmcm9tIE15cmlhXG4gICAgICAgIHNjb3BlLmxvYWREYXRhc2V0cygnJyk7XG5cbiAgICAgICAgc2NvcGUub3B0aW9uTmFtZSA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YXNldC51c2VyTmFtZSArICc6JyArIGRhdGFzZXQucHJvZ3JhbU5hbWUgKyAnOicgKyBkYXRhc2V0LnJlbGF0aW9uTmFtZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGREYXRhc2V0ID0gZnVuY3Rpb24obXlyaWFEYXRhc2V0KSB7XG4gICAgICAgICAgdmFyIGRhdGFzZXQgPSB7XG4gICAgICAgICAgICBncm91cDogJ215cmlhJyxcbiAgICAgICAgICAgIG5hbWU6IG15cmlhRGF0YXNldC5yZWxhdGlvbk5hbWUsXG4gICAgICAgICAgICB1cmw6IHNjb3BlLm15cmlhUmVzdFVybCArICcvZGF0YXNldC91c2VyLScgKyBteXJpYURhdGFzZXQudXNlck5hbWUgK1xuICAgICAgICAgICAgICAnL3Byb2dyYW0tJyArIG15cmlhRGF0YXNldC5wcm9ncmFtTmFtZSArXG4gICAgICAgICAgICAgICcvcmVsYXRpb24tJyArIG15cmlhRGF0YXNldC5yZWxhdGlvbk5hbWUgKyAnL2RhdGE/Zm9ybWF0PWpzb24nXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdqc29uJztcbiAgICAgICAgICBEYXRhc2V0LmRhdGFzZXQgPSBEYXRhc2V0LmFkZChkYXRhc2V0KTtcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmFkZFVybERhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBhZGRVcmxEYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYWRkVXJsRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2FkZHVybGRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRoZSBkYXRhc2V0IHRvIGFkZFxuICAgICAgICBzY29wZS5hZGRlZERhdGFzZXQgPSB7XG4gICAgICAgICAgZ3JvdXA6ICd1c2VyJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZEZyb21VcmwgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfTkVXX1VSTCwgZGF0YXNldC51cmwpO1xuXG4gICAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIG5ldyBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQoZGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBGZXRjaCAmIGFjdGl2YXRlIHRoZSBuZXdseS1yZWdpc3RlcmVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6aW5Hcm91cFxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgaW5Hcm91cFxuICogR2V0IGRhdGFzZXRzIGluIGEgcGFydGljdWxhciBncm91cFxuICogQHBhcmFtICB7U3RyaW5nfSBkYXRhc2V0R3JvdXAgT25lIG9mIFwic2FtcGxlLFwiIFwidXNlclwiLCBvciBcIm15cmlhXCJcbiAqIEByZXR1cm4ge0FycmF5fSBBbiBhcnJheSBvZiBkYXRhc2V0cyBpbiB0aGUgc3BlY2lmaWVkIGdyb3VwXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignaW5Hcm91cCcsIGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oYXJyLCBkYXRhc2V0R3JvdXApIHtcbiAgICAgIHJldHVybiBfLndoZXJlKGFyciwge1xuICAgICAgICBncm91cDogZGF0YXNldEdyb3VwXG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpjaGFuZ2VMb2FkZWREYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgY2hhbmdlTG9hZGVkRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2NoYW5nZUxvYWRlZERhdGFzZXQnLCBmdW5jdGlvbiAoRGF0YXNldCwgXykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvY2hhbmdlbG9hZGVkZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhwb3NlIGRhdGFzZXQgb2JqZWN0IGl0c2VsZiBzbyBjdXJyZW50IGRhdGFzZXQgY2FuIGJlIG1hcmtlZFxuICAgICAgICBzY29wZS5EYXRhc2V0ID0gRGF0YXNldDtcblxuICAgICAgICBzY29wZS51c2VyRGF0YSA9IF8uZmlsdGVyKERhdGFzZXQuZGF0YXNldHMsIGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YXNldC5ncm91cCAhPT0gJ3NhbXBsZSc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLnNhbXBsZURhdGEgPSBfLndoZXJlKERhdGFzZXQuZGF0YXNldHMsIHtcbiAgICAgICAgICBncm91cDogJ3NhbXBsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBEYXRhc2V0LmRhdGFzZXRzLmxlbmd0aDtcbiAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUudXNlckRhdGEgPSBfLmZpbHRlcihEYXRhc2V0LmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YXNldC5ncm91cCAhPT0gJ3NhbXBsZSc7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLnNlbGVjdERhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIHNlbGVjdGVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShkYXRhc2V0KTtcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGdldE5hbWVNYXAoZGF0YXNjaGVtYSkge1xuICByZXR1cm4gZGF0YXNjaGVtYS5yZWR1Y2UoZnVuY3Rpb24obSwgZmllbGREZWYpIHtcbiAgICBtW2ZpZWxkRGVmLmZpZWxkXSA9IGZpZWxkRGVmO1xuICAgIHJldHVybiBtO1xuICB9LCB7fSk7XG59XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ0RhdGFzZXQnLCBmdW5jdGlvbigkaHR0cCwgJHEsIEFsZXJ0cywgXywgZGwsIHZsLCBTYW1wbGVEYXRhLCBDb25maWcsIExvZ2dlcikge1xuICAgIHZhciBEYXRhc2V0ID0ge307XG5cbiAgICAvLyBTdGFydCB3aXRoIHRoZSBsaXN0IG9mIHNhbXBsZSBkYXRhc2V0c1xuICAgIHZhciBkYXRhc2V0cyA9IFNhbXBsZURhdGE7XG5cbiAgICBEYXRhc2V0LmRhdGFzZXRzID0gZGF0YXNldHM7XG4gICAgRGF0YXNldC5kYXRhc2V0ID0gZGF0YXNldHNbMV07XG4gICAgRGF0YXNldC5jdXJyZW50RGF0YXNldCA9IHVuZGVmaW5lZDsgIC8vIGRhdGFzZXQgYmVmb3JlIHVwZGF0ZVxuICAgIERhdGFzZXQuZGF0YXNjaGVtYSA9IFtdO1xuICAgIERhdGFzZXQuZGF0YXNjaGVtYS5ieU5hbWUgPSB7fTtcbiAgICBEYXRhc2V0LnN0YXRzID0ge307XG4gICAgRGF0YXNldC50eXBlID0gdW5kZWZpbmVkO1xuXG4gICAgdmFyIHR5cGVPcmRlciA9IHtcbiAgICAgIG5vbWluYWw6IDAsXG4gICAgICBvcmRpbmFsOiAwLFxuICAgICAgZ2VvZ3JhcGhpYzogMixcbiAgICAgIHRlbXBvcmFsOiAzLFxuICAgICAgcXVhbnRpdGF0aXZlOiA0XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5ID0ge307XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgIGlmIChmaWVsZERlZi5hZ2dyZWdhdGU9PT0nY291bnQnKSByZXR1cm4gNDtcbiAgICAgIHJldHVybiB0eXBlT3JkZXJbZmllbGREZWYudHlwZV07XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZSA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICByZXR1cm4gRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZShmaWVsZERlZikgKyAnXycgK1xuICAgICAgICAoZmllbGREZWYuYWdncmVnYXRlID09PSAnY291bnQnID8gJ34nIDogZmllbGREZWYuZmllbGQudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIC8vIH4gaXMgdGhlIGxhc3QgY2hhcmFjdGVyIGluIEFTQ0lJXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5Lm9yaWdpbmFsID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gMDsgLy8gbm8gc3dhcCB3aWxsIG9jY3VyXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LmZpZWxkID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgIHJldHVybiBmaWVsZERlZi5maWVsZDtcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkuY2FyZGluYWxpdHkgPSBmdW5jdGlvbihmaWVsZERlZiwgc3RhdHMpIHtcbiAgICAgIHJldHVybiBzdGF0c1tmaWVsZERlZi5maWVsZF0uZGlzdGluY3Q7XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlciA9IERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZTtcblxuICAgIERhdGFzZXQuZ2V0U2NoZW1hID0gZnVuY3Rpb24oZGF0YSwgc3RhdHMsIG9yZGVyKSB7XG4gICAgICB2YXIgdHlwZXMgPSBkbC50eXBlLmluZmVyQWxsKGRhdGEpLFxuICAgICAgICBzY2hlbWEgPSBfLnJlZHVjZSh0eXBlcywgZnVuY3Rpb24ocywgdHlwZSwgZmllbGQpIHtcbiAgICAgICAgICB2YXIgZmllbGREZWYgPSB7XG4gICAgICAgICAgICBmaWVsZDogZmllbGQsXG4gICAgICAgICAgICB0eXBlOiB2bC5kYXRhLnR5cGVzW3R5cGVdLFxuICAgICAgICAgICAgcHJpbWl0aXZlVHlwZTogdHlwZVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAoZmllbGREZWYudHlwZSA9PT0gdmwudHlwZS5RVUFOVElUQVRJVkUgJiYgc3RhdHNbZmllbGREZWYuZmllbGRdLmRpc3RpbmN0IDw9IDUpIHtcbiAgICAgICAgICAgIGZpZWxkRGVmLnR5cGUgPSB2bC50eXBlLk9SRElOQUw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcy5wdXNoKGZpZWxkRGVmKTtcbiAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgfSwgW10pO1xuXG4gICAgICBzY2hlbWEgPSBkbC5zdGFibGVzb3J0KHNjaGVtYSwgb3JkZXIgfHwgRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZVRoZW5OYW1lLCBEYXRhc2V0LmZpZWxkT3JkZXJCeS5maWVsZCk7XG5cbiAgICAgIHNjaGVtYS5wdXNoKHZsLmZpZWxkRGVmLmNvdW50KCkpO1xuICAgICAgcmV0dXJuIHNjaGVtYTtcbiAgICB9O1xuXG4gICAgLy8gdXBkYXRlIHRoZSBzY2hlbWEgYW5kIHN0YXRzXG4gICAgRGF0YXNldC5vblVwZGF0ZSA9IFtdO1xuXG4gICAgRGF0YXNldC51cGRhdGUgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICB2YXIgdXBkYXRlUHJvbWlzZTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfQ0hBTkdFLCBkYXRhc2V0Lm5hbWUpO1xuXG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9ICRxKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgICAgICAgICBEYXRhc2V0LnR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgRGF0YXNldC51cGRhdGVGcm9tRGF0YShkYXRhc2V0LCBkYXRhc2V0LnZhbHVlcyk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVwZGF0ZVByb21pc2UgPSAkaHR0cC5nZXQoZGF0YXNldC51cmwsIHtjYWNoZTogdHJ1ZX0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICB2YXIgZGF0YTtcblxuICAgICAgICAgIC8vIGZpcnN0IHNlZSB3aGV0aGVyIHRoZSBkYXRhIGlzIEpTT04sIG90aGVyd2lzZSB0cnkgdG8gcGFyc2UgQ1NWXG4gICAgICAgICAgaWYgKF8uaXNPYmplY3QocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgICBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICBEYXRhc2V0LnR5cGUgPSAnanNvbic7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBkbC5yZWFkKHJlc3BvbnNlLmRhdGEsIHt0eXBlOiAnY3N2J30pO1xuICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2Nzdic7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgRGF0YXNldC51cGRhdGVGcm9tRGF0YShkYXRhc2V0LCBkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIERhdGFzZXQub25VcGRhdGUuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gdXBkYXRlUHJvbWlzZS50aGVuKGxpc3RlbmVyKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBDb3B5IHRoZSBkYXRhc2V0IGludG8gdGhlIGNvbmZpZyBzZXJ2aWNlIG9uY2UgaXQgaXMgcmVhZHlcbiAgICAgIHVwZGF0ZVByb21pc2UudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgQ29uZmlnLnVwZGF0ZURhdGFzZXQoZGF0YXNldCwgRGF0YXNldC50eXBlKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdXBkYXRlUHJvbWlzZTtcbiAgICB9O1xuXG4gICAgRGF0YXNldC51cGRhdGVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGFzZXQsIGRhdGEpIHtcbiAgICAgIERhdGFzZXQuZGF0YSA9IGRhdGE7XG5cbiAgICAgIERhdGFzZXQuY3VycmVudERhdGFzZXQgPSBkYXRhc2V0O1xuICAgICAgRGF0YXNldC5zdGF0cyA9IGRsLnN1bW1hcnkoZGF0YSkucmVkdWNlKGZ1bmN0aW9uKHMsIHByb2ZpbGUpIHtcbiAgICAgICAgc1twcm9maWxlLmZpZWxkXSA9IHByb2ZpbGU7XG4gICAgICAgIHJldHVybiBzO1xuICAgICAgfSwge1xuICAgICAgICAnKic6IHtcbiAgICAgICAgICBtYXg6IGRhdGEubGVuZ3RoLFxuICAgICAgICAgIG1pbjogMFxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgZm9yICh2YXIgZmllbGROYW1lIGluIERhdGFzZXQuc3RhdHMpIHtcbiAgICAgICAgaWYgKGZpZWxkTmFtZSAhPT0gJyonKSB7XG4gICAgICAgICAgRGF0YXNldC5zdGF0c1tmaWVsZE5hbWVdLnNhbXBsZSA9IF8uc2FtcGxlKF8ucGx1Y2soRGF0YXNldC5kYXRhLCBmaWVsZE5hbWUpLCA3KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBEYXRhc2V0LmRhdGFzY2hlbWEgPSBEYXRhc2V0LmdldFNjaGVtYShEYXRhc2V0LmRhdGEsIERhdGFzZXQuc3RhdHMpO1xuICAgICAgRGF0YXNldC5kYXRhc2NoZW1hLmJ5TmFtZSA9IGdldE5hbWVNYXAoRGF0YXNldC5kYXRhc2NoZW1hKTtcbiAgICB9O1xuXG4gICAgRGF0YXNldC5hZGQgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICBpZiAoIWRhdGFzZXQuaWQpIHtcbiAgICAgICAgZGF0YXNldC5pZCA9IGRhdGFzZXQudXJsO1xuICAgICAgfVxuICAgICAgZGF0YXNldHMucHVzaChkYXRhc2V0KTtcblxuICAgICAgcmV0dXJuIGRhdGFzZXQ7XG4gICAgfTtcblxuICAgIHJldHVybiBEYXRhc2V0O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpkYXRhc2V0TW9kYWxcbiAqIEBkZXNjcmlwdGlvblxuICogIyBkYXRhc2V0TW9kYWxcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdkYXRhc2V0TW9kYWwnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9kYXRhc2V0bW9kYWwuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IGZhbHNlXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZGF0YXNldFNlbGVjdG9yJywgZnVuY3Rpb24oTW9kYWxzLCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2RhdGFzZXRzZWxlY3Rvci5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHt9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5sb2FkRGF0YXNldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX09QRU4pO1xuICAgICAgICAgIE1vZGFscy5vcGVuKCdkYXRhc2V0LW1vZGFsJyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZmlsZURyb3B6b25lXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZmlsZURyb3B6b25lXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLy8gQWRkIHRoZSBmaWxlIHJlYWRlciBhcyBhIG5hbWVkIGRlcGVuZGVuY3lcbiAgLmNvbnN0YW50KCdGaWxlUmVhZGVyJywgd2luZG93LkZpbGVSZWFkZXIpXG4gIC5kaXJlY3RpdmUoJ2ZpbGVEcm9wem9uZScsIGZ1bmN0aW9uIChNb2RhbHMsIEFsZXJ0cywgRmlsZVJlYWRlcikge1xuXG4gICAgLy8gSGVscGVyIG1ldGhvZHNcblxuICAgIGZ1bmN0aW9uIGlzU2l6ZVZhbGlkKHNpemUsIG1heFNpemUpIHtcbiAgICAgIC8vIFNpemUgaXMgcHJvdmlkZWQgaW4gYnl0ZXM7IG1heFNpemUgaXMgcHJvdmlkZWQgaW4gbWVnYWJ5dGVzXG4gICAgICAvLyBDb2VyY2UgbWF4U2l6ZSB0byBhIG51bWJlciBpbiBjYXNlIGl0IGNvbWVzIGluIGFzIGEgc3RyaW5nLFxuICAgICAgLy8gJiByZXR1cm4gdHJ1ZSB3aGVuIG1heCBmaWxlIHNpemUgd2FzIG5vdCBzcGVjaWZpZWQsIGlzIGVtcHR5LFxuICAgICAgLy8gb3IgaXMgc3VmZmljaWVudGx5IGxhcmdlXG4gICAgICByZXR1cm4gIW1heFNpemUgfHwgKCBzaXplIC8gMTAyNCAvIDEwMjQgPCArbWF4U2l6ZSApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVHlwZVZhbGlkKHR5cGUsIHZhbGlkTWltZVR5cGVzKSB7XG4gICAgICAgIC8vIElmIG5vIG1pbWUgdHlwZSByZXN0cmljdGlvbnMgd2VyZSBwcm92aWRlZCwgb3IgdGhlIHByb3ZpZGVkIGZpbGUnc1xuICAgICAgICAvLyB0eXBlIGlzIHdoaXRlbGlzdGVkLCB0eXBlIGlzIHZhbGlkXG4gICAgICByZXR1cm4gIXZhbGlkTWltZVR5cGVzIHx8ICggdmFsaWRNaW1lVHlwZXMuaW5kZXhPZih0eXBlKSA+IC0xICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9maWxlZHJvcHpvbmUuaHRtbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIC8vIFBlcm1pdCBhcmJpdHJhcnkgY2hpbGQgY29udGVudFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIG1heEZpbGVTaXplOiAnQCcsXG4gICAgICAgIHZhbGlkTWltZVR5cGVzOiAnQCcsXG4gICAgICAgIC8vIEV4cG9zZSB0aGlzIGRpcmVjdGl2ZSdzIGRhdGFzZXQgcHJvcGVydHkgdG8gcGFyZW50IHNjb3BlcyB0aHJvdWdoXG4gICAgICAgIC8vIHR3by13YXkgZGF0YWJpbmRpbmdcbiAgICAgICAgZGF0YXNldDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LyosIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuZGF0YXNldCA9IHNjb3BlLmRhdGFzZXQgfHwge307XG5cbiAgICAgICAgZWxlbWVudC5vbignZHJhZ292ZXIgZHJhZ2VudGVyJywgZnVuY3Rpb24gb25EcmFnRW50ZXIoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGV2ZW50Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmVmZmVjdEFsbG93ZWQgPSAnY29weSc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHJlYWRGaWxlKGZpbGUpIHtcbiAgICAgICAgICBpZiAoIWlzVHlwZVZhbGlkKGZpbGUudHlwZSwgc2NvcGUudmFsaWRNaW1lVHlwZXMpKSB7XG4gICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0ludmFsaWQgZmlsZSB0eXBlLiBGaWxlIG11c3QgYmUgb25lIG9mIGZvbGxvd2luZyB0eXBlczogJyArIHNjb3BlLnZhbGlkTWltZVR5cGVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWlzU2l6ZVZhbGlkKGZpbGUuc2l6ZSwgc2NvcGUubWF4RmlsZVNpemUpKSB7XG4gICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0ZpbGUgbXVzdCBiZSBzbWFsbGVyIHRoYW4gJyArIHNjb3BlLm1heEZpbGVTaXplICsgJyBNQicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgcmV0dXJuIHNjb3BlLiRhcHBseShmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgICBzY29wZS5kYXRhc2V0LmRhdGEgPSBldnQudGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICAgICAgLy8gU3RyaXAgZmlsZSBuYW1lIGV4dGVuc2lvbnMgZnJvbSB0aGUgdXBsb2FkZWQgZGF0YVxuICAgICAgICAgICAgICBzY29wZS5kYXRhc2V0Lm5hbWUgPSBmaWxlLm5hbWUucmVwbGFjZSgvXFwuXFx3KyQvLCAnJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0Vycm9yIHJlYWRpbmcgZmlsZScpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnQub24oJ2Ryb3AnLCBmdW5jdGlvbiBvbkRyb3AoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmVhZEZpbGUoZXZlbnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIuZmlsZXNbMF0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBlbGVtZW50LmZpbmQoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uIG9uVXBsb2FkKC8qZXZlbnQqLykge1xuICAgICAgICAgIC8vIFwidGhpc1wiIGlzIHRoZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgcmVhZEZpbGUodGhpcy5maWxlc1swXSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6cGFzdGVEYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgcGFzdGVEYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgncGFzdGVEYXRhc2V0JywgZnVuY3Rpb24gKERhdGFzZXQsIExvZ2dlciwgQ29uZmlnLCBfLCBkbCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvcGFzdGVkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNjb3BlIHZhcmlhYmxlc1xuICAgICAgICBzY29wZS5kYXRhc2V0ID0ge1xuICAgICAgICAgIG5hbWU6ICcnLFxuICAgICAgICAgIGRhdGE6ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRGF0YXNldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBkYXRhID0gZGwucmVhZChzY29wZS5kYXRhc2V0LmRhdGEsIHtcbiAgICAgICAgICAgIHR5cGU6ICdjc3YnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgcGFzdGVkRGF0YXNldCA9IHtcbiAgICAgICAgICAgIGlkOiBEYXRlLm5vdygpLCAgLy8gdGltZSBhcyBpZFxuICAgICAgICAgICAgbmFtZTogc2NvcGUuZGF0YXNldC5uYW1lLFxuICAgICAgICAgICAgdmFsdWVzOiBkYXRhLFxuICAgICAgICAgICAgZ3JvdXA6ICdwYXN0ZWQnXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIExvZyB0aGF0IHdlIGhhdmUgcGFzdGVkIGRhdGFcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9ORVdfUEFTVEUsIHBhc3RlZERhdGFzZXQubmFtZSk7XG5cbiAgICAgICAgICAvLyBSZWdpc3RlciB0aGUgcGFzdGVkIGRhdGEgYXMgYSBuZXcgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKHBhc3RlZERhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIG5ld2x5LXJlZ2lzdGVyZWQgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQudXBkYXRlKERhdGFzZXQuZGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBDbG9zZSB0aGlzIGRpcmVjdGl2ZSdzIGNvbnRhaW5pbmcgbW9kYWxcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgndmx1aScpLmNvbnN0YW50KCdTYW1wbGVEYXRhJywgW3tcbiAgbmFtZTogJ0JhcmxleScsXG4gIGRlc2NyaXB0aW9uOiAnQmFybGV5IHlpZWxkIGJ5IHZhcmlldHkgYWNyb3NzIHRoZSB1cHBlciBtaWR3ZXN0IGluIDE5MzEgYW5kIDE5MzInLFxuICB1cmw6ICdkYXRhL2JhcmxleS5qc29uJyxcbiAgaWQ6ICdiYXJsZXknLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ2FycycsXG4gIGRlc2NyaXB0aW9uOiAnQXV0b21vdGl2ZSBzdGF0aXN0aWNzIGZvciBhIHZhcmlldHkgb2YgY2FyIG1vZGVscyBiZXR3ZWVuIDE5NzAgJiAxOTgyJyxcbiAgdXJsOiAnZGF0YS9jYXJzLmpzb24nLFxuICBpZDogJ2NhcnMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ3JpbWVhJyxcbiAgdXJsOiAnZGF0YS9jcmltZWEuanNvbicsXG4gIGlkOiAnY3JpbWVhJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0RyaXZpbmcnLFxuICB1cmw6ICdkYXRhL2RyaXZpbmcuanNvbicsXG4gIGlkOiAnZHJpdmluZycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdJcmlzJyxcbiAgdXJsOiAnZGF0YS9pcmlzLmpzb24nLFxuICBpZDogJ2lyaXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnSm9icycsXG4gIHVybDogJ2RhdGEvam9icy5qc29uJyxcbiAgaWQ6ICdqb2JzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ1BvcHVsYXRpb24nLFxuICB1cmw6ICdkYXRhL3BvcHVsYXRpb24uanNvbicsXG4gIGlkOiAncG9wdWxhdGlvbicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdNb3ZpZXMnLFxuICB1cmw6ICdkYXRhL21vdmllcy5qc29uJyxcbiAgaWQ6ICdtb3ZpZXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQmlyZHN0cmlrZXMnLFxuICB1cmw6ICdkYXRhL2JpcmRzdHJpa2VzLmpzb24nLFxuICBpZDogJ2JpcmRzdHJpa2VzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0J1cnRpbicsXG4gIHVybDogJ2RhdGEvYnVydGluLmpzb24nLFxuICBpZDogJ2J1cnRpbicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDYW1wYWlnbnMnLFxuICB1cmw6ICdkYXRhL3dlYmFsbDI2Lmpzb24nLFxuICBpZDogJ3dlYmFsbDI2JyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59XSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZmllbGRJbmZvXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZmllbGRJbmZvXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZmllbGRJbmZvJywgZnVuY3Rpb24gKERhdGFzZXQsIERyb3AsIHZsLCBjb25zdHMsIF8pIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdmaWVsZGluZm8vZmllbGRpbmZvLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWVsZERlZjogJz0nLFxuICAgICAgICBzaG93VHlwZTogJz0nLFxuICAgICAgICBzaG93SW5mbzogJz0nLFxuICAgICAgICBzaG93Q2FyZXQ6ICc9JyxcbiAgICAgICAgcG9wdXBDb250ZW50OiAnPScsXG4gICAgICAgIHNob3dSZW1vdmU6ICc9JyxcbiAgICAgICAgcmVtb3ZlQWN0aW9uOiAnJicsXG4gICAgICAgIGFjdGlvbjogJyYnLFxuICAgICAgICBkaXNhYmxlQ291bnRDYXJldDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGZ1bmNzUG9wdXA7XG4gICAgICAgIHNjb3BlLnZsVHlwZSA9IHZsLnR5cGU7XG4gICAgICAgIHNjb3BlLnR5cGVOYW1lcyA9IGNvbnN0cy50eXBlTmFtZXM7XG4gICAgICAgIHNjb3BlLnN0YXRzID0gRGF0YXNldC5zdGF0c1tzY29wZS5maWVsZERlZi5maWVsZF07XG4gICAgICAgIHNjb3BlLmNvbnRhaW5zVHlwZSA9IGZ1bmN0aW9uKHR5cGVzLCB0eXBlKSB7XG4gICAgICAgICAgcmV0dXJuIF8uY29udGFpbnModHlwZXMsIHR5cGUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHN3aXRjaChzY29wZS5maWVsZERlZi50eXBlKXtcbiAgICAgICAgICBjYXNlIHZsLnR5cGUuT1JESU5BTDpcbiAgICAgICAgICAgIHNjb3BlLmljb24gPSAnZmEtZm9udCc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIHZsLnR5cGUuTk9NSU5BTDpcbiAgICAgICAgICAgIHNjb3BlLmljb24gPSAnZmEtZm9udCc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIHZsLnR5cGUuUVVBTlRJVEFUSVZFOlxuICAgICAgICAgICAgc2NvcGUuaWNvbiA9ICdpY29uLWhhc2gnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSB2bC50eXBlLlRFTVBPUkFMOlxuICAgICAgICAgICAgc2NvcGUuaWNvbiA9ICdmYS1jYWxlbmRhcic7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHNjb3BlLmNsaWNrZWQgPSBmdW5jdGlvbigkZXZlbnQpe1xuICAgICAgICAgIGlmKHNjb3BlLmFjdGlvbiAmJiAkZXZlbnQudGFyZ2V0ICE9PSBlbGVtZW50LmZpbmQoJy5mYS1jYXJldC1kb3duJylbMF0gJiZcbiAgICAgICAgICAgICRldmVudC50YXJnZXQgIT09IGVsZW1lbnQuZmluZCgnc3Bhbi50eXBlJylbMF0pIHtcbiAgICAgICAgICAgIHNjb3BlLmFjdGlvbigkZXZlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5mdW5jID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgICAgICByZXR1cm4gZmllbGREZWYuYWdncmVnYXRlIHx8IGZpZWxkRGVmLnRpbWVVbml0IHx8XG4gICAgICAgICAgICAoZmllbGREZWYuYmluICYmICdiaW4nKSB8fFxuICAgICAgICAgICAgZmllbGREZWYuX2FnZ3JlZ2F0ZSB8fCBmaWVsZERlZi5fdGltZVVuaXQgfHxcbiAgICAgICAgICAgIChmaWVsZERlZi5fYmluICYmICdiaW4nKSB8fCAoZmllbGREZWYuX2FueSAmJiAnYXV0bycpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLiR3YXRjaCgncG9wdXBDb250ZW50JywgZnVuY3Rpb24ocG9wdXBDb250ZW50KSB7XG4gICAgICAgICAgaWYgKCFwb3B1cENvbnRlbnQpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICBpZiAoZnVuY3NQb3B1cCkge1xuICAgICAgICAgICAgZnVuY3NQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3NQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICAgIGNvbnRlbnQ6IHBvcHVwQ29udGVudCxcbiAgICAgICAgICAgIHRhcmdldDogZWxlbWVudC5maW5kKCcudHlwZS1jYXJldCcpWzBdLFxuICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXG4gICAgICAgICAgICBvcGVuT246ICdjbGljaydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChmdW5jc1BvcHVwKSB7XG4gICAgICAgICAgICBmdW5jc1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkubG9nZ2VyXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbG9nZ2VyXG4gKiBTZXJ2aWNlIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0xvZ2dlcicsIGZ1bmN0aW9uICgkbG9jYXRpb24sICR3aW5kb3csIGNvbnN0cywgQW5hbHl0aWNzKSB7XG5cbiAgICB2YXIgc2VydmljZSA9IHt9O1xuXG4gICAgc2VydmljZS5sZXZlbHMgPSB7XG4gICAgICBPRkY6IHtpZDonT0ZGJywgcmFuazowfSxcbiAgICAgIFRSQUNFOiB7aWQ6J1RSQUNFJywgcmFuazoxfSxcbiAgICAgIERFQlVHOiB7aWQ6J0RFQlVHJywgcmFuazoyfSxcbiAgICAgIElORk86IHtpZDonSU5GTycsIHJhbms6M30sXG4gICAgICBXQVJOOiB7aWQ6J1dBUk4nLCByYW5rOjR9LFxuICAgICAgRVJST1I6IHtpZDonRVJST1InLCByYW5rOjV9LFxuICAgICAgRkFUQUw6IHtpZDonRkFUQUwnLCByYW5rOjZ9XG4gICAgfTtcblxuICAgIHNlcnZpY2UuYWN0aW9ucyA9IHtcbiAgICAgIC8vIERBVEFcbiAgICAgIElOSVRJQUxJWkU6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0lOSVRJQUxJWkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgVU5ETzoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnVU5ETycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFJFRE86IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ1JFRE8nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX0NIQU5HRToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX09QRU46IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1BBU1RFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX05FV19QQVNURScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1VSTDoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9ORVdfVVJMJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgLy8gQk9PS01BUktcbiAgICAgIEJPT0tNQVJLX0FERDoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfQUREJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfUkVNT1ZFOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19SRU1PVkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19PUEVOOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xPU0U6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xFQVI6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6ICdCT09LTUFSS19DTEVBUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIC8vIENIQVJUXG4gICAgICBDSEFSVF9NT1VTRU9WRVI6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX01PVVNFT1ZFUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9NT1VTRU9VVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfTU9VU0VPVVQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfUkVOREVSOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9SRU5ERVInLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfRVhQT1NFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9FWFBPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfVE9PTFRJUDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9UT09MVElQX0VORDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUF9FTkQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuXG4gICAgICBTT1JUX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonU09SVF9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBNQVJLX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTUFSS19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEUklMTF9ET1dOX09QRU46IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0RSSUxMX0RPV05fT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERSSUxMX0RPV05fQ0xPU0U6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdEUklMTF9ET1dOX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTE9HX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ0xPR19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBUUkFOU1BPU0VfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnVFJBTlNQT1NFX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIE5VTExfRklMVEVSX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTlVMTF9GSUxURVJfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICBDTFVTVEVSX1NFTEVDVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0xVU1RFUl9TRUxFQ1QnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBMT0FEX01PUkU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0xPQURfTU9SRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gRklFTERTXG4gICAgICBGSUVMRFNfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdGSUVMRFMnLCBpZDogJ0ZJRUxEU19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGSUVMRFNfUkVTRVQ6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRklFTERTX1JFU0VUJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRlVOQ19DSEFOR0U6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRlVOQ19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vUE9MRVNUQVJcbiAgICAgIFNQRUNfQ0hBTkdFOiB7Y2F0ZWdvcnk6J1BPTEVTVEFSJywgaWQ6ICdTUEVDX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBGSUVMRF9EUk9QOiB7Y2F0ZWdvcnk6ICdQT0xFU1RBUicsIGlkOiAnRklFTERfRFJPUCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBNQVJLX0NIQU5HRToge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ01BUktfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfVxuICAgIH07XG5cbiAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uLCBsYWJlbCwgZGF0YSkge1xuICAgICAgaWYgKCFjb25zdHMubG9nZ2luZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgdmFsdWUgPSBkYXRhID8gZGF0YS52YWx1ZSA6IHVuZGVmaW5lZDtcbiAgICAgIGlmKGFjdGlvbi5sZXZlbC5yYW5rID49IHNlcnZpY2UubGV2ZWxzLklORk8ucmFuaykge1xuICAgICAgICBBbmFseXRpY3MudHJhY2tFdmVudChhY3Rpb24uY2F0ZWdvcnksIGFjdGlvbi5pZCwgbGFiZWwsIHZhbHVlKTtcbiAgICAgICAgY29uc29sZS5sb2coJ1tMb2dnaW5nXSAnLCBhY3Rpb24uaWQsIGxhYmVsLCBkYXRhKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgc2VydmljZS5sb2dJbnRlcmFjdGlvbihzZXJ2aWNlLmFjdGlvbnMuSU5JVElBTElaRSwgY29uc3RzLmFwcElkKTtcblxuICAgIHJldHVybiBzZXJ2aWNlO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTptb2RhbFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIG1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnbW9kYWwnLCBmdW5jdGlvbiAoJGRvY3VtZW50LCBNb2RhbHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdtb2RhbC9tb2RhbC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgYXV0b09wZW46ICc9JyxcbiAgICAgICAgbWF4V2lkdGg6ICdAJ1xuICAgICAgfSxcbiAgICAgIC8vIFByb3ZpZGUgYW4gaW50ZXJmYWNlIGZvciBjaGlsZCBkaXJlY3RpdmVzIHRvIGNsb3NlIHRoaXMgbW9kYWxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICB2YXIgbW9kYWxJZCA9IGF0dHJzLmlkO1xuXG4gICAgICAgIGlmIChzY29wZS5tYXhXaWR0aCkge1xuICAgICAgICAgIHNjb3BlLndyYXBwZXJTdHlsZSA9ICdtYXgtd2lkdGg6JyArIHNjb3BlLm1heFdpZHRoO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmYXVsdCB0byBjbG9zZWQgdW5sZXNzIGF1dG9PcGVuIGlzIHNldFxuICAgICAgICBzY29wZS5pc09wZW4gPSBzY29wZS5hdXRvT3BlbjtcblxuICAgICAgICAvLyBjbG9zZSBvbiBlc2NcbiAgICAgICAgZnVuY3Rpb24gZXNjYXBlKGUpIHtcbiAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAyNyAmJiBzY29wZS5pc09wZW4pIHtcbiAgICAgICAgICAgIHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudCgkZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgZXNjYXBlKTtcblxuICAgICAgICAvLyBSZWdpc3RlciB0aGlzIG1vZGFsIHdpdGggdGhlIHNlcnZpY2VcbiAgICAgICAgTW9kYWxzLnJlZ2lzdGVyKG1vZGFsSWQsIHNjb3BlKTtcbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIE1vZGFscy5kZXJlZ2lzdGVyKG1vZGFsSWQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTptb2RhbENsb3NlQnV0dG9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbW9kYWxDbG9zZUJ1dHRvblxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ21vZGFsQ2xvc2VCdXR0b24nLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdtb2RhbC9tb2RhbGNsb3NlYnV0dG9uLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXm1vZGFsJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgICdjbG9zZUNhbGxiYWNrJzogJyZvbkNsb3NlJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIHNjb3BlLmNsb3NlTW9kYWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICBpZiAoc2NvcGUuY2xvc2VDYWxsYmFjaykge1xuICAgICAgICAgICAgc2NvcGUuY2xvc2VDYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmx1aS5Nb2RhbHNcbiAqIEBkZXNjcmlwdGlvblxuICogIyBNb2RhbHNcbiAqIFNlcnZpY2UgdXNlZCB0byBjb250cm9sIG1vZGFsIHZpc2liaWxpdHkgZnJvbSBhbnl3aGVyZSBpbiB0aGUgYXBwbGljYXRpb25cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnTW9kYWxzJywgZnVuY3Rpb24gKCRjYWNoZUZhY3RvcnkpIHtcblxuICAgIC8vIFRPRE86IFRoZSB1c2Ugb2Ygc2NvcGUgaGVyZSBhcyB0aGUgbWV0aG9kIGJ5IHdoaWNoIGEgbW9kYWwgZGlyZWN0aXZlXG4gICAgLy8gaXMgcmVnaXN0ZXJlZCBhbmQgY29udHJvbGxlZCBtYXkgbmVlZCB0byBjaGFuZ2UgdG8gc3VwcG9ydCByZXRyaWV2aW5nXG4gICAgLy8gZGF0YSBmcm9tIGEgbW9kYWwgYXMgbWF5IGJlIG5lZWRlZCBpbiAjNzdcbiAgICB2YXIgbW9kYWxzQ2FjaGUgPSAkY2FjaGVGYWN0b3J5KCdtb2RhbHMnKTtcblxuICAgIC8vIFB1YmxpYyBBUElcbiAgICByZXR1cm4ge1xuICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKGlkLCBzY29wZSkge1xuICAgICAgICBpZiAobW9kYWxzQ2FjaGUuZ2V0KGlkKSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Nhbm5vdCByZWdpc3RlciB0d28gbW9kYWxzIHdpdGggaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxzQ2FjaGUucHV0KGlkLCBzY29wZSk7XG4gICAgICB9LFxuXG4gICAgICBkZXJlZ2lzdGVyOiBmdW5jdGlvbihpZCkge1xuICAgICAgICBtb2RhbHNDYWNoZS5yZW1vdmUoaWQpO1xuICAgICAgfSxcblxuICAgICAgLy8gT3BlbiBhIG1vZGFsXG4gICAgICBvcGVuOiBmdW5jdGlvbihpZCkge1xuICAgICAgICB2YXIgbW9kYWxTY29wZSA9IG1vZGFsc0NhY2hlLmdldChpZCk7XG4gICAgICAgIGlmICghbW9kYWxTY29wZSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VucmVnaXN0ZXJlZCBtb2RhbCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbFNjb3BlLmlzT3BlbiA9IHRydWU7XG4gICAgICB9LFxuXG4gICAgICAvLyBDbG9zZSBhIG1vZGFsXG4gICAgICBjbG9zZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIG1vZGFsU2NvcGUgPSBtb2RhbHNDYWNoZS5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1vZGFsU2NvcGUpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbnJlZ2lzdGVyZWQgbW9kYWwgaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxTY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgIH0sXG5cbiAgICAgIGVtcHR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgbW9kYWxzQ2FjaGUucmVtb3ZlQWxsKCk7XG4gICAgICB9LFxuXG4gICAgICBjb3VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBtb2RhbHNDYWNoZS5pbmZvKCkuc2l6ZTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTp0YWJcbiAqIEBkZXNjcmlwdGlvblxuICogIyB0YWJcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd0YWInLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICd0YWJzL3RhYi5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl50YWJzZXQnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBoZWFkaW5nOiAnQCdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIHRhYnNldENvbnRyb2xsZXIpIHtcbiAgICAgICAgdGFic2V0Q29udHJvbGxlci5hZGRUYWIoc2NvcGUpO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnRhYnNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHRhYnNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3RhYnNldCcsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3RhYnMvdGFic2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG5cbiAgICAgIC8vIEludGVyZmFjZSBmb3IgdGFicyB0byByZWdpc3RlciB0aGVtc2VsdmVzXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMudGFicyA9IFtdO1xuXG4gICAgICAgIHRoaXMuYWRkVGFiID0gZnVuY3Rpb24odGFiU2NvcGUpIHtcbiAgICAgICAgICAvLyBGaXJzdCB0YWIgaXMgYWx3YXlzIGF1dG8tYWN0aXZhdGVkOyBvdGhlcnMgYXV0by1kZWFjdGl2YXRlZFxuICAgICAgICAgIHRhYlNjb3BlLmFjdGl2ZSA9IHNlbGYudGFicy5sZW5ndGggPT09IDA7XG4gICAgICAgICAgc2VsZi50YWJzLnB1c2godGFiU2NvcGUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuc2hvd1RhYiA9IGZ1bmN0aW9uKHNlbGVjdGVkVGFiKSB7XG4gICAgICAgICAgc2VsZi50YWJzLmZvckVhY2goZnVuY3Rpb24odGFiKSB7XG4gICAgICAgICAgICAvLyBBY3RpdmF0ZSB0aGUgc2VsZWN0ZWQgdGFiLCBkZWFjdGl2YXRlIGFsbCBvdGhlcnNcbiAgICAgICAgICAgIHRhYi5hY3RpdmUgPSB0YWIgPT09IHNlbGVjdGVkVGFiO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfSxcblxuICAgICAgLy8gRXhwb3NlIGNvbnRyb2xsZXIgdG8gdGVtcGxhdGVzIGFzIFwidGFic2V0XCJcbiAgICAgIGNvbnRyb2xsZXJBczogJ3RhYnNldCdcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd2bFBsb3QnLCBmdW5jdGlvbihkbCwgdmwsIHZnLCAkdGltZW91dCwgJHEsIERhdGFzZXQsIENvbmZpZywgY29uc3RzLCBfLCAkZG9jdW1lbnQsIExvZ2dlciwgSGVhcCwgJHdpbmRvdykge1xuICAgIHZhciBjb3VudGVyID0gMDtcbiAgICB2YXIgTUFYX0NBTlZBU19TSVpFID0gMzI3NjcvMiwgTUFYX0NBTlZBU19BUkVBID0gMjY4NDM1NDU2LzQ7XG5cbiAgICB2YXIgcmVuZGVyUXVldWUgPSBuZXcgSGVhcChmdW5jdGlvbihhLCBiKXtcbiAgICAgICAgcmV0dXJuIGIucHJpb3JpdHkgLSBhLnByaW9yaXR5O1xuICAgICAgfSksXG4gICAgICByZW5kZXJpbmcgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIGdldFJlbmRlcmVyKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgIC8vIHVzZSBjYW52YXMgYnkgZGVmYXVsdCBidXQgdXNlIHN2ZyBpZiB0aGUgdmlzdWFsaXphdGlvbiBpcyB0b28gYmlnXG4gICAgICBpZiAod2lkdGggPiBNQVhfQ0FOVkFTX1NJWkUgfHwgaGVpZ2h0ID4gTUFYX0NBTlZBU19TSVpFIHx8IHdpZHRoKmhlaWdodCA+IE1BWF9DQU5WQVNfQVJFQSkge1xuICAgICAgICByZXR1cm4gJ3N2Zyc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ2NhbnZhcyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndmxwbG90L3ZscGxvdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge1xuICAgICAgICBjaGFydDogJz0nLFxuXG4gICAgICAgIC8vb3B0aW9uYWxcbiAgICAgICAgZGlzYWJsZWQ6ICc9JyxcbiAgICAgICAgaXNJbkxpc3Q6ICc9JyxcblxuICAgICAgICBhbHdheXNTY3JvbGxhYmxlOiAnPScsXG4gICAgICAgIGNvbmZpZ1NldDogJ0AnLFxuICAgICAgICBtYXhIZWlnaHQ6Jz0nLFxuICAgICAgICBtYXhXaWR0aDogJz0nLFxuICAgICAgICBvdmVyZmxvdzogJz0nLFxuICAgICAgICBwcmlvcml0eTogJz0nLFxuICAgICAgICByZXNjYWxlOiAnPScsXG4gICAgICAgIHRodW1ibmFpbDogJz0nLFxuICAgICAgICB0b29sdGlwOiAnPScsXG4gICAgICB9LFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBIT1ZFUl9USU1FT1VUID0gNTAwLFxuICAgICAgICAgIFRPT0xUSVBfVElNRU9VVCA9IDI1MDtcblxuICAgICAgICBzY29wZS52aXNJZCA9IChjb3VudGVyKyspO1xuICAgICAgICBzY29wZS5ob3ZlclByb21pc2UgPSBudWxsO1xuICAgICAgICBzY29wZS50b29sdGlwUHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUudG9vbHRpcEFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICBzY29wZS5kZXN0cm95ZWQgPSBmYWxzZTtcblxuICAgICAgICB2YXIgZm9ybWF0ID0gZGwuZm9ybWF0Lm51bWJlcignJyk7XG5cbiAgICAgICAgc2NvcGUubW91c2VvdmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUuaG92ZXJQcm9taXNlID0gJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9NT1VTRU9WRVIsICcnLCBzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgICAgc2NvcGUuaG92ZXJGb2N1cyA9ICFzY29wZS50aHVtYm5haWw7XG4gICAgICAgICAgfSwgSE9WRVJfVElNRU9VVCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUubW91c2VvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoc2NvcGUuaG92ZXJGb2N1cykge1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX01PVVNFT1VULCAnJywgc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkdGltZW91dC5jYW5jZWwoc2NvcGUuaG92ZXJQcm9taXNlKTtcbiAgICAgICAgICBzY29wZS5ob3ZlckZvY3VzID0gc2NvcGUudW5sb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiB2aWV3T25Nb3VzZU92ZXIoZXZlbnQsIGl0ZW0pIHtcbiAgICAgICAgICBpZiAoIWl0ZW0gfHwgIWl0ZW0uZGF0dW0pIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICBzY29wZS50b29sdGlwUHJvbWlzZSA9ICR0aW1lb3V0KGZ1bmN0aW9uIGFjdGl2YXRlVG9vbHRpcCgpe1xuXG4gICAgICAgICAgICAvLyBhdm9pZCBzaG93aW5nIHRvb2x0aXAgZm9yIGZhY2V0J3MgYmFja2dyb3VuZFxuICAgICAgICAgICAgaWYgKGl0ZW0uZGF0dW0uX2ZhY2V0SUQpIHJldHVybjtcblxuICAgICAgICAgICAgc2NvcGUudG9vbHRpcEFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfVE9PTFRJUCwgaXRlbS5kYXR1bSk7XG5cblxuICAgICAgICAgICAgLy8gY29udmVydCBkYXRhIGludG8gYSBmb3JtYXQgdGhhdCB3ZSBjYW4gZWFzaWx5IHVzZSB3aXRoIG5nIHRhYmxlIGFuZCBuZy1yZXBlYXRcbiAgICAgICAgICAgIC8vIFRPRE86IHJldmlzZSBpZiB0aGlzIGlzIGFjdHVhbGx5IGEgZ29vZCBpZGVhXG4gICAgICAgICAgICBzY29wZS5kYXRhID0gXyhpdGVtLmRhdHVtKS5vbWl0KCdfcHJldicsICdfaWQnKSAvLyBvbWl0IHZlZ2EgaW50ZXJuYWxzXG4gICAgICAgICAgICAgIC5wYWlycygpLnZhbHVlKClcbiAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgICAgICAgcFsxXSA9IGRsLmlzTnVtYmVyKHBbMV0pID8gZm9ybWF0KHBbMV0pIDogcFsxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcDtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgICAgIHZhciB0b29sdGlwID0gZWxlbWVudC5maW5kKCcudmlzLXRvb2x0aXAnKSxcbiAgICAgICAgICAgICAgJGJvZHkgPSBhbmd1bGFyLmVsZW1lbnQoJGRvY3VtZW50KSxcbiAgICAgICAgICAgICAgd2lkdGggPSB0b29sdGlwLndpZHRoKCksXG4gICAgICAgICAgICAgIGhlaWdodD0gdG9vbHRpcC5oZWlnaHQoKTtcblxuICAgICAgICAgICAgLy8gcHV0IHRvb2x0aXAgYWJvdmUgaWYgaXQncyBuZWFyIHRoZSBzY3JlZW4ncyBib3R0b20gYm9yZGVyXG4gICAgICAgICAgICBpZiAoZXZlbnQucGFnZVkrMTAraGVpZ2h0IDwgJGJvZHkuaGVpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIChldmVudC5wYWdlWSsxMCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIChldmVudC5wYWdlWS0xMC1oZWlnaHQpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcHV0IHRvb2x0aXAgb24gbGVmdCBpZiBpdCdzIG5lYXIgdGhlIHNjcmVlbidzIHJpZ2h0IGJvcmRlclxuICAgICAgICAgICAgaWYgKGV2ZW50LnBhZ2VYKzEwKyB3aWR0aCA8ICRib2R5LndpZHRoKCkpIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ2xlZnQnLCAoZXZlbnQucGFnZVgrMTApKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCdsZWZ0JywgKGV2ZW50LnBhZ2VYLTEwLXdpZHRoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgVE9PTFRJUF9USU1FT1VUKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZpZXdPbk1vdXNlT3V0KGV2ZW50LCBpdGVtKSB7XG4gICAgICAgICAgLy9jbGVhciBwb3NpdGlvbnNcbiAgICAgICAgICB2YXIgdG9vbHRpcCA9IGVsZW1lbnQuZmluZCgnLnZpcy10b29sdGlwJyk7XG4gICAgICAgICAgdG9vbHRpcC5jc3MoJ3RvcCcsIG51bGwpO1xuICAgICAgICAgIHRvb2x0aXAuY3NzKCdsZWZ0JywgbnVsbCk7XG4gICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLnRvb2x0aXBQcm9taXNlKTtcbiAgICAgICAgICBpZiAoc2NvcGUudG9vbHRpcEFjdGl2ZSkge1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1RPT0xUSVBfRU5ELCBpdGVtLmRhdHVtKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2NvcGUudG9vbHRpcEFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgIHNjb3BlLmRhdGEgPSBbXTtcbiAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRWZ1NwZWMoKSB7XG4gICAgICAgICAgdmFyIGNvbmZpZ1NldCA9IHNjb3BlLmNvbmZpZ1NldCB8fCBjb25zdHMuZGVmYXVsdENvbmZpZ1NldCB8fCB7fTtcblxuICAgICAgICAgIGlmICghc2NvcGUuY2hhcnQudmxTcGVjKSByZXR1cm47XG5cbiAgICAgICAgICB2YXIgdmxTcGVjID0gXy5jbG9uZURlZXAoc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICBkbC5leHRlbmQodmxTcGVjLmNvbmZpZywgQ29uZmlnW2NvbmZpZ1NldF0oKSk7XG5cbiAgICAgICAgICAvLyB1c2UgY2hhcnQgc3RhdHMgaWYgYXZhaWxhYmxlIChmb3IgZXhhbXBsZSBmcm9tIGJvb2ttYXJrcylcbiAgICAgICAgICB2YXIgc3RhdHMgPSBzY29wZS5jaGFydC5zdGF0cyB8fCBEYXRhc2V0LnN0YXRzO1xuXG4gICAgICAgICAgLy8gU3BlY2lhbCBSdWxlc1xuICAgICAgICAgIHZhciBlbmNvZGluZyA9IHZsU3BlYy5lbmNvZGluZztcbiAgICAgICAgICBpZiAoZW5jb2RpbmcpIHtcbiAgICAgICAgICAgIC8vIHB1dCB4LWF4aXMgb24gdG9wIGlmIHRvbyBoaWdoLWNhcmRpbmFsaXR5XG4gICAgICAgICAgICBpZiAoZW5jb2RpbmcueSAmJiBlbmNvZGluZy55LmZpZWxkICYmIFt2bC50eXBlLk5PTUlOQUwsIHZsLnR5cGUuT1JESU5BTF0uaW5kZXhPZihlbmNvZGluZy55LnR5cGUpID4gLTEpIHtcbiAgICAgICAgICAgICAgaWYgKGVuY29kaW5nLngpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRTdGF0cyA9IHN0YXRzW2VuY29kaW5nLnkuZmllbGRdO1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZFN0YXRzICYmIHZsLmZpZWxkRGVmLmNhcmRpbmFsaXR5KGVuY29kaW5nLnksIHN0YXRzKSA+IDMwKSB7XG4gICAgICAgICAgICAgICAgICAoZW5jb2RpbmcueC5heGlzID0gZW5jb2RpbmcueC5heGlzIHx8IHt9KS5vcmllbnQgPSAndG9wJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXNlIHNtYWxsZXIgYmFuZCBzaXplIGlmIGhhcyBYIG9yIFkgaGFzIGNhcmRpbmFsaXR5ID4gMTAgb3IgaGFzIGEgZmFjZXRcbiAgICAgICAgICAgIGlmIChlbmNvZGluZy5yb3cgfHxcbiAgICAgICAgICAgICAgICAoZW5jb2RpbmcueSAmJiBzdGF0c1tlbmNvZGluZy55LmZpZWxkXSAmJiB2bC5maWVsZERlZi5jYXJkaW5hbGl0eShlbmNvZGluZy55LCBzdGF0cykgPiAxMCkpIHtcbiAgICAgICAgICAgICAgKGVuY29kaW5nLnkuc2NhbGUgPSBlbmNvZGluZy55LnNjYWxlIHx8IHt9KS5iYW5kV2lkdGggPSAxMjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGVuY29kaW5nLmNvbHVtbiB8fFxuICAgICAgICAgICAgICAgIChlbmNvZGluZy54ICYmIHN0YXRzW2VuY29kaW5nLnguZmllbGRdICYmIHZsLmZpZWxkRGVmLmNhcmRpbmFsaXR5KGVuY29kaW5nLngsIHN0YXRzKSA+IDEwKSkge1xuICAgICAgICAgICAgICAoZW5jb2RpbmcueC5zY2FsZSA9IGVuY29kaW5nLnguc2NhbGUgfHwge30pLmJhbmRXaWR0aCA9IDEyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZW5jb2RpbmcuY29sb3IgJiYgZW5jb2RpbmcuY29sb3IudHlwZSA9PT0gdmwudHlwZS5OT01JTkFMICYmXG4gICAgICAgICAgICAgICAgdmwuZmllbGREZWYuY2FyZGluYWxpdHkoZW5jb2RpbmcueCwgc3RhdHMpID4gMTApIHtcbiAgICAgICAgICAgICAgKGVuY29kaW5nLmNvbG9yLnNjYWxlID0gZW5jb2RpbmcuY29sb3Iuc2NhbGUgfHwge30pLnJhbmdlID0gJ2NhdGVnb3J5MjAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiB2bC5jb21waWxlKHZsU3BlYykuc3BlYztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFZpc0VsZW1lbnQoKSB7XG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZmluZCgnLnZlZ2EgPiA6Zmlyc3QtY2hpbGQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlc2NhbGVJZkVuYWJsZSgpIHtcbiAgICAgICAgICB2YXIgdmlzRWxlbWVudCA9IGdldFZpc0VsZW1lbnQoKTtcbiAgICAgICAgICBpZiAoc2NvcGUucmVzY2FsZSkge1xuICAgICAgICAgICAgLy8gaGF2ZSB0byBkaWdlc3QgdGhlIHNjb3BlIHRvIGVuc3VyZSB0aGF0XG4gICAgICAgICAgICAvLyBlbGVtZW50LndpZHRoKCkgaXMgYm91bmQgYnkgcGFyZW50IGVsZW1lbnQhXG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgICAgIHZhciB4UmF0aW8gPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAwLjIsXG4gICAgICAgICAgICAgICAgZWxlbWVudC53aWR0aCgpIC8gIC8qIHdpZHRoIG9mIHZscGxvdCBib3VuZGluZyBib3ggKi9cbiAgICAgICAgICAgICAgICBzY29wZS53aWR0aCAvKiB3aWR0aCBvZiB0aGUgdmlzICovXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmICh4UmF0aW8gPCAxKSB7XG4gICAgICAgICAgICAgIHZpc0VsZW1lbnQud2lkdGgoc2NvcGUud2lkdGggKiB4UmF0aW8pXG4gICAgICAgICAgICAgICAgICAgICAgICAuaGVpZ2h0KHNjb3BlLmhlaWdodCAqIHhSYXRpbyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmlzRWxlbWVudC5jc3MoJ3RyYW5zZm9ybScsIG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgLmNzcygndHJhbnNmb3JtLW9yaWdpbicsIG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFNob3J0aGFuZCgpIHtcbiAgICAgICAgICByZXR1cm4gc2NvcGUuY2hhcnQuc2hvcnRoYW5kIHx8IChzY29wZS5jaGFydC52bFNwZWMgPyB2bC5zaG9ydGhhbmQuc2hvcnRlbihzY29wZS5jaGFydC52bFNwZWMpIDogJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVuZGVyUXVldWVOZXh0KCkge1xuICAgICAgICAgIC8vIHJlbmRlciBuZXh0IGl0ZW0gaW4gdGhlIHF1ZXVlXG4gICAgICAgICAgaWYgKHJlbmRlclF1ZXVlLnNpemUoKSA+IDApIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gcmVuZGVyUXVldWUucG9wKCk7XG4gICAgICAgICAgICBuZXh0LnBhcnNlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG9yIHNheSB0aGF0IG5vIG9uZSBpcyByZW5kZXJpbmdcbiAgICAgICAgICAgIHJlbmRlcmluZyA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlbmRlcihzcGVjKSB7XG4gICAgICAgICAgaWYgKCFzcGVjKSB7XG4gICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICB2aWV3Lm9mZignbW91c2VvdmVyJyk7XG4gICAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW91dCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHNjb3BlLmhlaWdodCA9IHNwZWMuaGVpZ2h0O1xuICAgICAgICAgIGlmICghZWxlbWVudCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignY2FuIG5vdCBmaW5kIHZpcyBlbGVtZW50Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHNob3J0aGFuZCA9IGdldFNob3J0aGFuZCgpO1xuXG4gICAgICAgICAgc2NvcGUucmVuZGVyZXIgPSBnZXRSZW5kZXJlcihzcGVjKTtcblxuICAgICAgICAgIGZ1bmN0aW9uIHBhcnNlVmVnYSgpIHtcbiAgICAgICAgICAgIC8vIGlmIG5vIGxvbmdlciBhIHBhcnQgb2YgdGhlIGxpc3QsIGNhbmNlbCFcbiAgICAgICAgICAgIGlmIChzY29wZS5kZXN0cm95ZWQgfHwgc2NvcGUuZGlzYWJsZWQgfHwgKHNjb3BlLmlzSW5MaXN0ICYmIHNjb3BlLmNoYXJ0LmZpZWxkU2V0S2V5ICYmICFzY29wZS5pc0luTGlzdChzY29wZS5jaGFydC5maWVsZFNldEtleSkpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYW5jZWwgcmVuZGVyaW5nJywgc2hvcnRoYW5kKTtcbiAgICAgICAgICAgICAgcmVuZGVyUXVldWVOZXh0KCk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAvLyByZW5kZXIgaWYgc3RpbGwgYSBwYXJ0IG9mIHRoZSBsaXN0XG4gICAgICAgICAgICB2Zy5wYXJzZS5zcGVjKHNwZWMsIGZ1bmN0aW9uKGNoYXJ0KSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGVuZFBhcnNlID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAgICAgdmlldyA9IG51bGw7XG4gICAgICAgICAgICAgICAgdmlldyA9IGNoYXJ0KHtlbDogZWxlbWVudFswXX0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFjb25zdHMudXNlVXJsKSB7XG4gICAgICAgICAgICAgICAgICB2aWV3LmRhdGEoe3JhdzogRGF0YXNldC5kYXRhfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gdmlldy5yZW5kZXJlcihnZXRSZW5kZXJlcihzcGVjLndpZHRoLCBzY29wZS5oZWlnaHQpKTtcbiAgICAgICAgICAgICAgICB2aWV3LnVwZGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHZpc0VsZW1lbnQgPSBlbGVtZW50LmZpbmQoJy52ZWdhID4gOmZpcnN0LWNoaWxkJyk7XG4gICAgICAgICAgICAgICAgLy8gcmVhZCAgPGNhbnZhcz4vPHN2Zz7igJlzIHdpZHRoIGFuZCBoZWlnaHQsIHdoaWNoIGlzIHZlZ2EncyBvdXRlciB3aWR0aCBhbmQgaGVpZ2h0IHRoYXQgaW5jbHVkZXMgYXhlcyBhbmQgbGVnZW5kc1xuICAgICAgICAgICAgICAgIHNjb3BlLndpZHRoID0gIHZpc0VsZW1lbnQud2lkdGgoKTtcbiAgICAgICAgICAgICAgICBzY29wZS5oZWlnaHQgPSB2aXNFbGVtZW50LmhlaWdodCgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGNvbnN0cy5kZWJ1Zykge1xuICAgICAgICAgICAgICAgICAgJHdpbmRvdy52aWV3cyA9ICR3aW5kb3cudmlld3MgfHwge307XG4gICAgICAgICAgICAgICAgICAkd2luZG93LnZpZXdzW3Nob3J0aGFuZF0gPSB2aWV3O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9SRU5ERVIsICcnLCBzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgICAgICAgIHJlc2NhbGVJZkVuYWJsZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGVuZENoYXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcnNlIHNwZWMnLCAoZW5kUGFyc2Utc3RhcnQpLCAnY2hhcnRpbmcnLCAoZW5kQ2hhcnQtZW5kUGFyc2UpLCBzaG9ydGhhbmQpO1xuICAgICAgICAgICAgICAgIGlmIChzY29wZS50b29sdGlwKSB7XG4gICAgICAgICAgICAgICAgICB2aWV3Lm9uKCdtb3VzZW92ZXInLCB2aWV3T25Nb3VzZU92ZXIpO1xuICAgICAgICAgICAgICAgICAgdmlldy5vbignbW91c2VvdXQnLCB2aWV3T25Nb3VzZU91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgcmVuZGVyUXVldWVOZXh0KCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFyZW5kZXJpbmcpIHsgLy8gaWYgbm8gaW5zdGFuY2UgaXMgYmVpbmcgcmVuZGVyIC0tIHJlbmRlcmluZyBub3dcbiAgICAgICAgICAgIHJlbmRlcmluZz10cnVlO1xuICAgICAgICAgICAgcGFyc2VWZWdhKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSBxdWV1ZSBpdFxuICAgICAgICAgICAgcmVuZGVyUXVldWUucHVzaCh7XG4gICAgICAgICAgICAgIHByaW9yaXR5OiBzY29wZS5wcmlvcml0eSB8fCAwLFxuICAgICAgICAgICAgICBwYXJzZTogcGFyc2VWZWdhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlldztcbiAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIE9taXQgZGF0YSBwcm9wZXJ0eSB0byBzcGVlZCB1cCBkZWVwIHdhdGNoXG4gICAgICAgICAgcmV0dXJuIF8ub21pdChzY29wZS5jaGFydC52bFNwZWMsICdkYXRhJyk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBzcGVjID0gc2NvcGUuY2hhcnQudmdTcGVjID0gZ2V0VmdTcGVjKCk7XG4gICAgICAgICAgaWYgKCFzY29wZS5jaGFydC5jbGVhblNwZWMpIHtcbiAgICAgICAgICAgIHNjb3BlLmNoYXJ0LmNsZWFuU3BlYyA9IHZsLnNwZWMuZ2V0Q2xlYW5TcGVjKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlbmRlcihzcGVjKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCd2bHBsb3QgZGVzdHJveWVkJyk7XG4gICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW92ZXInKTtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW91dCcpO1xuICAgICAgICAgICAgdmlldyA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzaG9ydGhhbmQgPSBnZXRTaG9ydGhhbmQoKTtcbiAgICAgICAgICBpZiAoY29uc3RzLmRlYnVnICYmICR3aW5kb3cudmlld3MpIHtcbiAgICAgICAgICAgIGRlbGV0ZSAkd2luZG93LnZpZXdzW3Nob3J0aGFuZF07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgICAgICAvLyBGSVhNRSBhbm90aGVyIHdheSB0aGF0IHNob3VsZCBlbGltaW5hdGUgdGhpbmdzIGZyb20gbWVtb3J5IGZhc3RlciBzaG91bGQgYmUgcmVtb3ZpbmdcbiAgICAgICAgICAvLyBtYXliZSBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgIC8vIHJlbmRlclF1ZXVlLnNwbGljZShyZW5kZXJRdWV1ZS5pbmRleE9mKHBhcnNlVmVnYSksIDEpKTtcbiAgICAgICAgICAvLyBidXQgd2l0aG91dCBwcm9wZXIgdGVzdGluZywgdGhpcyBpcyByaXNraWVyIHRoYW4gc2V0dGluZyBzY29wZS5kZXN0cm95ZWQuXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6dmlzTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyB2aXNMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwJywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCBkbCwgdmwsIERhdGFzZXQsIExvZ2dlciwgXykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3ZscGxvdGdyb3VwL3ZscGxvdGdyb3VwLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZ2V0RHJvcFRhcmdldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiAkZWxlbWVudC5maW5kKCcuZmEtd3JlbmNoJylbMF07XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgLyogcGFzcyB0byB2bHBsb3QgKiovXG4gICAgICAgIGNoYXJ0OiAnPScsXG5cbiAgICAgICAgLy9vcHRpb25hbFxuICAgICAgICBkaXNhYmxlZDogJz0nLFxuICAgICAgICBpc0luTGlzdDogJz0nLFxuXG4gICAgICAgIGFsd2F5c1Njcm9sbGFibGU6ICc9JyxcbiAgICAgICAgY29uZmlnU2V0OiAnQCcsXG4gICAgICAgIG1heEhlaWdodDogJz0nLFxuICAgICAgICBtYXhXaWR0aDogJz0nLFxuICAgICAgICBvdmVyZmxvdzogJz0nLFxuICAgICAgICBwcmlvcml0eTogJz0nLFxuICAgICAgICByZXNjYWxlOiAnPScsXG4gICAgICAgIHRodW1ibmFpbDogJz0nLFxuICAgICAgICB0b29sdGlwOiAnPScsXG5cbiAgICAgICAgLyogdmxwbG90Z3JvdXAgc3BlY2lmaWMgKi9cblxuICAgICAgICBmaWVsZFNldDogJz0nLFxuXG4gICAgICAgIHNob3dCb29rbWFyazogJ0AnLFxuICAgICAgICBzaG93RGVidWc6ICc9JyxcbiAgICAgICAgc2hvd0V4cGFuZDogJz0nLFxuICAgICAgICBzaG93RmlsdGVyTnVsbDogJ0AnLFxuICAgICAgICBzaG93TGFiZWw6ICdAJyxcbiAgICAgICAgc2hvd0xvZzogJ0AnLFxuICAgICAgICBzaG93TWFyazogJ0AnLFxuICAgICAgICBzaG93U29ydDogJ0AnLFxuICAgICAgICBzaG93VHJhbnNwb3NlOiAnQCcsXG5cbiAgICAgICAgYWx3YXlzU2VsZWN0ZWQ6ICc9JyxcbiAgICAgICAgaXNTZWxlY3RlZDogJz0nLFxuICAgICAgICBoaWdobGlnaHRlZDogJz0nLFxuICAgICAgICBleHBhbmRBY3Rpb246ICcmJyxcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSkge1xuICAgICAgICBzY29wZS5Cb29rbWFya3MgPSBCb29rbWFya3M7XG4gICAgICAgIHNjb3BlLmNvbnN0cyA9IGNvbnN0cztcbiAgICAgICAgc2NvcGUuRGF0YXNldCA9IERhdGFzZXQ7XG5cbiAgICAgICAgLy8gRGVmZXIgcmVuZGVyaW5nIHRoZSBkZWJ1ZyBEcm9wIHBvcHVwIHVudGlsIGl0IGlzIHJlcXVlc3RlZFxuICAgICAgICBzY29wZS5yZW5kZXJQb3B1cCA9IGZhbHNlO1xuICAgICAgICAvLyBVc2UgXy5vbmNlIGJlY2F1c2UgdGhlIHBvcHVwIG9ubHkgbmVlZHMgdG8gYmUgaW5pdGlhbGl6ZWQgb25jZVxuICAgICAgICBzY29wZS5pbml0aWFsaXplUG9wdXAgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUucmVuZGVyUG9wdXAgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5sb2dDb2RlID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhuYW1lKyc6XFxuXFxuJywgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgTE9HXG5cbiAgICAgICAgc2NvcGUubG9nID0ge307XG4gICAgICAgIHNjb3BlLmxvZy5zdXBwb3J0ID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc3BlYykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nLFxuICAgICAgICAgICAgZmllbGREZWYgPSBlbmNvZGluZ1tjaGFubmVsXTtcblxuICAgICAgICAgIHJldHVybiBmaWVsZERlZiAmJiBmaWVsZERlZi50eXBlID09PSB2bC50eXBlLlFVQU5USVRBVElWRSAmJiAhZmllbGREZWYuYmluO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmxvZy50b2dnbGUgPSBmdW5jdGlvbihzcGVjLCBjaGFubmVsKSB7XG4gICAgICAgICAgaWYgKCFzY29wZS5sb2cuc3VwcG9ydChzcGVjLCBjaGFubmVsKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHZhciBmaWVsZERlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbF0sXG4gICAgICAgICAgICBzY2FsZSA9IGZpZWxkRGVmLnNjYWxlID0gZmllbGREZWYuc2NhbGUgfHwge307XG5cbiAgICAgICAgICBzY2FsZS50eXBlID0gc2NhbGUudHlwZSA9PT0gJ2xvZycgPyAnbGluZWFyJyA6ICdsb2cnO1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5MT0dfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICB9O1xuICAgICAgICBzY29wZS5sb2cuYWN0aXZlID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc2NvcGUubG9nLnN1cHBvcnQoc3BlYywgY2hhbm5lbCkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICB2YXIgZmllbGREZWYgPSBzcGVjLmVuY29kaW5nW2NoYW5uZWxdLFxuICAgICAgICAgICAgc2NhbGUgPSBmaWVsZERlZi5zY2FsZSA9IGZpZWxkRGVmLnNjYWxlIHx8IHt9O1xuXG4gICAgICAgICAgcmV0dXJuIHNjYWxlLnR5cGUgPT09ICdsb2cnO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBGSUxURVJcbiAgICAgICAgLy8gVE9ETzogZXh0cmFjdCB0b2dnbGVGaWx0ZXJOdWxsIHRvIGJlIGl0cyBvd24gY2xhc3NcblxuICAgICAgICBzY29wZS50b2dnbGVGaWx0ZXJOdWxsID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5OVUxMX0ZJTFRFUl9UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCk7XG5cbiAgICAgICAgICBzcGVjLmNvbmZpZyA9IHNwZWMuY29uZmlnIHx8IHt9O1xuICAgICAgICAgIHNwZWMuY29uZmlnLmZpbHRlck51bGwgPSBzcGVjLmNvbmZpZy5maWx0ZXJOdWxsIHx8IHtcbiAgICAgICAgICAgIC8vIFRPRE86IGluaXRpYXRlIHRoaXMgZnJvbSBmaWx0ZXJOdWxsJ3Mgc2NoZW1hIGluc3RlYWRcbiAgICAgICAgICAgIG5vbWluYWw6IGZhbHNlLFxuICAgICAgICAgICAgb3JkaW5hbDogZmFsc2UsXG4gICAgICAgICAgICB0ZW1wb3JhbDogdHJ1ZSxcbiAgICAgICAgICAgIHF1YW50aXRhdGl2ZTogdHJ1ZVxuICAgICAgICAgIH07XG4gICAgICAgICAgc3BlYy5jb25maWcuZmlsdGVyTnVsbC5vcmRpbmFsID0gIXNwZWMuY29uZmlnLmZpbHRlck51bGwub3JkaW5hbDtcbiAgICAgICAgICBzcGVjLmNvbmZpZy5maWx0ZXJOdWxsLm5vbWluYWwgPSAhc3BlYy5jb25maWcuZmlsdGVyTnVsbC5ub21pbmFsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRvZ2dsZUZpbHRlck51bGwuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMsIHN0YXRzKSB7XG4gICAgICAgICAgdmFyIGZpZWxkRGVmcyA9IHZsLnNwZWMuZmllbGREZWZzKHNwZWMpO1xuICAgICAgICAgIGZvciAodmFyIGkgaW4gZmllbGREZWZzKSB7XG4gICAgICAgICAgICB2YXIgZmllbGREZWYgPSBmaWVsZERlZnNbaV07XG4gICAgICAgICAgICBpZiAoXy5jb250YWlucyhbdmwudHlwZS5PUkRJTkFMLCB2bC50eXBlLk5PTUlOQUxdLCBmaWVsZERlZi50eXBlKSAmJlxuICAgICAgICAgICAgICAgIChmaWVsZERlZi5uYW1lIGluIHN0YXRzKSAmJlxuICAgICAgICAgICAgICAgIHN0YXRzW2ZpZWxkRGVmLm5hbWVdLm1pc3NpbmcgPiAwXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBTT1JUXG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgdG9nZ2xlU29ydCB0byBiZSBpdHMgb3duIGNsYXNzXG5cbiAgICAgICAgdmFyIHRvZ2dsZVNvcnQgPSBzY29wZS50b2dnbGVTb3J0ID0ge307XG5cbiAgICAgICAgdG9nZ2xlU29ydC5tb2RlcyA9IFsnb3JkaW5hbC1hc2NlbmRpbmcnLCAnb3JkaW5hbC1kZXNjZW5kaW5nJyxcbiAgICAgICAgICAncXVhbnRpdGF0aXZlLWFzY2VuZGluZycsICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZycsICdjdXN0b20nXTtcblxuICAgICAgICB0b2dnbGVTb3J0LnRvZ2dsZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuU09SVF9UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCk7XG4gICAgICAgICAgdmFyIGN1cnJlbnRNb2RlID0gdG9nZ2xlU29ydC5tb2RlKHNwZWMpO1xuICAgICAgICAgIHZhciBjdXJyZW50TW9kZUluZGV4ID0gdG9nZ2xlU29ydC5tb2Rlcy5pbmRleE9mKGN1cnJlbnRNb2RlKTtcblxuICAgICAgICAgIHZhciBuZXdNb2RlSW5kZXggPSAoY3VycmVudE1vZGVJbmRleCArIDEpICUgKHRvZ2dsZVNvcnQubW9kZXMubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgdmFyIG5ld01vZGUgPSB0b2dnbGVTb3J0Lm1vZGVzW25ld01vZGVJbmRleF07XG5cbiAgICAgICAgICBjb25zb2xlLmxvZygndG9nZ2xlU29ydCcsIGN1cnJlbnRNb2RlLCBuZXdNb2RlKTtcblxuICAgICAgICAgIHZhciBjaGFubmVscyA9IHRvZ2dsZVNvcnQuY2hhbm5lbHMoc3BlYyk7XG4gICAgICAgICAgc3BlYy5lbmNvZGluZ1tjaGFubmVscy5vcmRpbmFsXS5zb3J0ID0gdG9nZ2xlU29ydC5nZXRTb3J0KG5ld01vZGUsIHNwZWMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKiBHZXQgc29ydCBwcm9wZXJ0eSBkZWZpbml0aW9uIHRoYXQgbWF0Y2hlcyBlYWNoIG1vZGUuICovXG4gICAgICAgIHRvZ2dsZVNvcnQuZ2V0U29ydCA9IGZ1bmN0aW9uKG1vZGUsIHNwZWMpIHtcbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ29yZGluYWwtYXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuICdhc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtb2RlID09PSAnb3JkaW5hbC1kZXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuICdkZXNjZW5kaW5nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgY2hhbm5lbHMgPSB0b2dnbGVTb3J0LmNoYW5uZWxzKHNwZWMpO1xuICAgICAgICAgIHZhciBxRW5jRGVmID0gc3BlYy5lbmNvZGluZ1tjaGFubmVscy5xdWFudGl0YXRpdmVdO1xuXG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdxdWFudGl0YXRpdmUtYXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgb3A6IHFFbmNEZWYuYWdncmVnYXRlLFxuICAgICAgICAgICAgICBmaWVsZDogcUVuY0RlZi5maWVsZCxcbiAgICAgICAgICAgICAgb3JkZXI6ICdhc2NlbmRpbmcnXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtb2RlID09PSAncXVhbnRpdGF0aXZlLWRlc2NlbmRpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBvcDogcUVuY0RlZi5hZ2dyZWdhdGUsXG4gICAgICAgICAgICAgIGZpZWxkOiBxRW5jRGVmLmZpZWxkLFxuICAgICAgICAgICAgICBvcmRlcjogJ2Rlc2NlbmRpbmcnXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQubW9kZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICB2YXIgY2hhbm5lbHMgPSB0b2dnbGVTb3J0LmNoYW5uZWxzKHNwZWMpO1xuICAgICAgICAgIHZhciBzb3J0ID0gc3BlYy5lbmNvZGluZ1tjaGFubmVscy5vcmRpbmFsXS5zb3J0O1xuXG4gICAgICAgICAgaWYgKHNvcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuICdvcmRpbmFsLWFzY2VuZGluZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2dnbGVTb3J0Lm1vZGVzLmxlbmd0aCAtIDEgOyBpKyspIHtcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIHNvcnQgbWF0Y2hlcyBhbnkgb2YgdGhlIHNvcnQgZm9yIGVhY2ggbW9kZSBleGNlcHQgJ2N1c3RvbScuXG4gICAgICAgICAgICB2YXIgbW9kZSA9IHRvZ2dsZVNvcnQubW9kZXNbaV07XG4gICAgICAgICAgICB2YXIgc29ydE9mTW9kZSA9IHRvZ2dsZVNvcnQuZ2V0U29ydChtb2RlLCBzcGVjKTtcblxuICAgICAgICAgICAgaWYgKF8uaXNFcXVhbChzb3J0LCBzb3J0T2ZNb2RlKSkge1xuICAgICAgICAgICAgICByZXR1cm4gbW9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZGwuaXNPYmplY3Qoc29ydCkgJiYgc29ydC5vcCAmJiBzb3J0LmZpZWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2N1c3RvbSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2ludmFsaWQgbW9kZScpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuY2hhbm5lbHMgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgcmV0dXJuIHNwZWMuZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgc3BlYy5lbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCA/XG4gICAgICAgICAgICAgICAgICB7b3JkaW5hbDogJ3gnLCBxdWFudGl0YXRpdmU6ICd5J30gOlxuICAgICAgICAgICAgICAgICAge29yZGluYWw6ICd5JywgcXVhbnRpdGF0aXZlOiAneCd9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMsIHN0YXRzKSB7XG4gICAgICAgICAgdmFyIGVuY29kaW5nID0gc3BlYy5lbmNvZGluZztcblxuICAgICAgICAgIGlmICh2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICdyb3cnKSB8fCB2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICdjb2x1bW4nKSB8fFxuICAgICAgICAgICAgIXZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ3gnKSB8fCAhdmwuZW5jb2RpbmcuaGFzKGVuY29kaW5nLCAneScpIHx8XG4gICAgICAgICAgICAhdmwuc3BlYy5hbHdheXNOb09jY2x1c2lvbihzcGVjLCBzdGF0cykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAoZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk9SRElOQUwpICYmXG4gICAgICAgICAgICAgIHZsLmZpZWxkRGVmLmlzTWVhc3VyZShlbmNvZGluZy55KVxuICAgICAgICAgICAgKSA/ICd4JyA6XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgIChlbmNvZGluZy55LnR5cGUgPT09IHZsLnR5cGUuTk9NSU5BTCB8fCBlbmNvZGluZy55LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCkgJiZcbiAgICAgICAgICAgICAgdmwuZmllbGREZWYuaXNNZWFzdXJlKGVuY29kaW5nLngpXG4gICAgICAgICAgICApID8gJ3knIDogZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUudG9nZ2xlU29ydENsYXNzID0gZnVuY3Rpb24odmxTcGVjKSB7XG4gICAgICAgICAgaWYgKCF2bFNwZWMgfHwgIXRvZ2dsZVNvcnQuc3VwcG9ydCh2bFNwZWMsIERhdGFzZXQuc3RhdHMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2ludmlzaWJsZSc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIG9yZGluYWxDaGFubmVsID0gdmxTcGVjICYmIHRvZ2dsZVNvcnQuY2hhbm5lbHModmxTcGVjKS5vcmRpbmFsLFxuICAgICAgICAgICAgbW9kZSA9IHZsU3BlYyAmJiB0b2dnbGVTb3J0Lm1vZGUodmxTcGVjKTtcblxuICAgICAgICAgIHZhciBkaXJlY3Rpb25DbGFzcyA9IG9yZGluYWxDaGFubmVsID09PSAneCcgPyAnc29ydC14ICcgOiAnJztcblxuICAgICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnb3JkaW5hbC1hc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbHBoYS1hc2MnO1xuICAgICAgICAgICAgY2FzZSAnb3JkaW5hbC1kZXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYWxwaGEtZGVzYyc7XG4gICAgICAgICAgICBjYXNlICdxdWFudGl0YXRpdmUtYXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYW1vdW50LWFzYyc7XG4gICAgICAgICAgICBjYXNlICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFtb3VudC1kZXNjJztcbiAgICAgICAgICAgIGRlZmF1bHQ6IC8vIGN1c3RvbVxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydCc7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRyYW5zcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5UUkFOU1BPU0VfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICAgIHZsLnNwZWMudHJhbnNwb3NlKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLmNoYXJ0ID0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmRpcmVjdGl2ZTp2aXNMaXN0SXRlbVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHZpc0xpc3RJdGVtXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90R3JvdXBQb3B1cCcsIGZ1bmN0aW9uIChEcm9wKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl52bFBsb3RHcm91cCcsXG4gICAgICBzY29wZTogZmFsc2UsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIHZsUGxvdEdyb3VwQ29udHJvbGxlcikge1xuICAgICAgICB2YXIgZGVidWdQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICBjb250ZW50OiBlbGVtZW50LmZpbmQoJy5kZXYtdG9vbCcpWzBdLFxuICAgICAgICAgIHRhcmdldDogdmxQbG90R3JvdXBDb250cm9sbGVyLmdldERyb3BUYXJnZXQoKSxcbiAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSByaWdodCcsXG4gICAgICAgICAgb3Blbk9uOiAnY2xpY2snLFxuICAgICAgICAgIGNvbnN0cmFpblRvV2luZG93OiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWJ1Z1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgZmFjZXRlZHZpei5maWx0ZXI6cmVwb3J0VXJsXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyByZXBvcnRVcmxcbiAqIEZpbHRlciBpbiB0aGUgZmFjZXRlZHZpei5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdyZXBvcnRVcmwnLCBmdW5jdGlvbiAoY29tcGFjdEpTT05GaWx0ZXIsIF8sIGNvbnN0cykge1xuICAgIGZ1bmN0aW9uIHZveWFnZXJSZXBvcnQocGFyYW1zKSB7XG4gICAgICB2YXIgdXJsID0gJ2h0dHBzOi8vZG9jcy5nb29nbGUuY29tL2Zvcm1zL2QvMVQ5WkExNEYzbW16ckhSN0pKVlVLeVBYenJNcUY1NENqTElPanYyRTdaRU0vdmlld2Zvcm0/JztcblxuICAgICAgaWYgKHBhcmFtcy5maWVsZHMpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKF8udmFsdWVzKHBhcmFtcy5maWVsZHMpKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuMTI0NTE5OTQ3Nz0nICsgcXVlcnkgKyAnJic7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMuc3BlYykge1xuICAgICAgICB2YXIgc3BlYyA9IF8ub21pdChwYXJhbXMuc3BlYywgJ2NvbmZpZycpO1xuICAgICAgICBzcGVjID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKHNwZWMpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMzIzNjgwMTM2PScgKyBzcGVjICsgJyYnO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnNwZWMyKSB7XG4gICAgICAgIHZhciBzcGVjMiA9IF8ub21pdChwYXJhbXMuc3BlYzIsICdjb25maWcnKTtcbiAgICAgICAgc3BlYzIgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoc3BlYzIpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS44NTMxMzc3ODY9JyArIHNwZWMyICsgJyYnO1xuICAgICAgfVxuXG4gICAgICB2YXIgdHlwZVByb3AgPSAnZW50cnkuMTk0MDI5MjY3Nz0nO1xuICAgICAgc3dpdGNoIChwYXJhbXMudHlwZSkge1xuICAgICAgICBjYXNlICd2bCc6XG4gICAgICAgICAgdXJsICs9IHR5cGVQcm9wICsgJ1Zpc3VhbGl6YXRpb24rUmVuZGVyaW5nKyhWZWdhbGl0ZSkmJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAndnInOlxuICAgICAgICAgIHVybCArPSB0eXBlUHJvcCArICdSZWNvbW1lbmRlcitBbGdvcml0aG0rKFZpc3JlYykmJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZnYnOlxuICAgICAgICAgIHVybCArPSB0eXBlUHJvcCArICdSZWNvbW1lbmRlcitVSSsoRmFjZXRlZFZpeikmJztcbiAgICAgICAgICBicmVhaztcblxuICAgICAgfVxuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2bHVpUmVwb3J0KHBhcmFtcykge1xuICAgICAgdmFyIHVybCA9ICdodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9mb3Jtcy9kLzF4S3MtcUdhTFpFVWZiVG1oZG1Tb1MxM09LT0VwdXVfTk5XRTVUQUFtbF9ZL3ZpZXdmb3JtPyc7XG4gICAgICBpZiAocGFyYW1zLnNwZWMpIHtcbiAgICAgICAgdmFyIHNwZWMgPSBfLm9taXQocGFyYW1zLnNwZWMsICdjb25maWcnKTtcbiAgICAgICAgc3BlYyA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihzcGVjKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuMTI0NTE5OTQ3Nz0nICsgc3BlYyArICcmJztcbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbnN0cy5hcHBJZCA9PT0gJ3ZveWFnZXInID8gdm95YWdlclJlcG9ydCA6IHZsdWlSZXBvcnQ7XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdjb21wYWN0SlNPTicsIGZ1bmN0aW9uKEpTT04zKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICByZXR1cm4gSlNPTjMuc3RyaW5naWZ5KGlucHV0LCBudWxsLCAnICAnLCA4MCk7XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdmVnYS1saXRlLXVpLmZpbHRlcjp1bmRlcnNjb3JlMnNwYWNlXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyB1bmRlcnNjb3JlMnNwYWNlXG4gKiBGaWx0ZXIgaW4gdGhlIHZlZ2EtbGl0ZS11aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCd1bmRlcnNjb3JlMnNwYWNlJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgIHJldHVybiBpbnB1dCA/IGlucHV0LnJlcGxhY2UoL18rL2csICcgJykgOiAnJztcbiAgICB9O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdmVnYS1saXRlLXVpLmZpbHRlcjplbmNvZGVVcmlcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGVuY29kZVVyaVxuICogRmlsdGVyIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignZW5jb2RlVVJJJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgIHJldHVybiB3aW5kb3cuZW5jb2RlVVJJKGlucHV0KTtcbiAgICB9O1xuICB9KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
